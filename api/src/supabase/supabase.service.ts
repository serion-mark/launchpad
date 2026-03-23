import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

const SUPABASE_API = 'https://api.supabase.com';

interface SupabaseProject {
  id: string;
  ref: string;
  name: string;
  status: string;
  organization_id: string;
  region: string;
  created_at: string;
}

interface SupabaseApiKey {
  name: string;
  api_key: string;
}

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly accessToken: string;
  private readonly orgId: string;
  private readonly enabled: boolean;

  constructor(private prisma: PrismaService) {
    this.accessToken = process.env.SUPABASE_ACCESS_TOKEN || '';
    this.orgId = process.env.SUPABASE_ORG_ID || '';
    this.enabled = !!(this.accessToken && this.orgId);

    if (!this.enabled) {
      this.logger.warn('Supabase 프로비저닝 비활성화 — SUPABASE_ACCESS_TOKEN 또는 SUPABASE_ORG_ID 미설정');
    } else {
      this.logger.log('Supabase 프로비저닝 활성화됨');
    }
  }

  /** Supabase 프로비저닝이 가능한지 확인 */
  isEnabled(): boolean {
    return this.enabled;
  }

  /** Management API 호출 헬퍼 */
  private async apiCall<T>(
    method: string,
    path: string,
    body?: any,
  ): Promise<T> {
    const url = `${SUPABASE_API}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Supabase API ${method} ${path} 실패 (${res.status}): ${errorText}`);
    }

    return res.json() as Promise<T>;
  }

  /** 1. Supabase 프로젝트 생성 */
  async createProject(name: string): Promise<SupabaseProject> {
    const dbPass = crypto.randomBytes(16).toString('hex') + 'A1!'; // 안전한 비밀번호
    const sanitizedName = name
      .replace(/[^a-zA-Z0-9가-힣\s-]/g, '')
      .slice(0, 40)
      .trim() || 'foundry-app';

    this.logger.log(`Supabase 프로젝트 생성: ${sanitizedName}`);

    const project = await this.apiCall<SupabaseProject>('POST', '/v1/projects', {
      organization_id: this.orgId,
      name: `foundry-${sanitizedName}`,
      db_pass: dbPass,
      region: process.env.SUPABASE_REGION || 'ap-northeast-1',
    });

    // DB 비밀번호를 반환에 포함 (임시 저장용)
    (project as any)._dbPass = dbPass;
    return project;
  }

  /** 2. 프로젝트가 ACTIVE_HEALTHY 될 때까지 대기 */
  async waitForReady(ref: string, maxWaitMs = 180000): Promise<boolean> {
    const interval = 5000; // 5초 간격
    const maxAttempts = Math.ceil(maxWaitMs / interval);

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const project = await this.apiCall<SupabaseProject>('GET', `/v1/projects/${ref}`);
        this.logger.log(`Supabase [${ref}] 상태: ${project.status} (${i + 1}/${maxAttempts})`);

        if (project.status === 'ACTIVE_HEALTHY') {
          return true;
        }
      } catch (error: any) {
        this.logger.warn(`Supabase 상태 확인 실패: ${error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    this.logger.error(`Supabase [${ref}] ${maxWaitMs / 1000}초 내 준비 안 됨`);
    return false;
  }

  /** 3. API 키 조회 (anon + service_role) */
  async getApiKeys(ref: string): Promise<{ anonKey: string; serviceKey: string }> {
    const keys = await this.apiCall<SupabaseApiKey[]>('GET', `/v1/projects/${ref}/api-keys`);

    const anonKey = keys.find(k => k.name === 'anon')?.api_key || '';
    const serviceKey = keys.find(k => k.name === 'service_role')?.api_key || '';

    if (!anonKey) {
      throw new Error(`Supabase [${ref}] anon key를 찾을 수 없습니다`);
    }

    return { anonKey, serviceKey };
  }

  /** 4. SQL 마이그레이션 실행 — /database/query API 사용 + 재시도 */
  async runMigration(ref: string, sql: string): Promise<void> {
    this.logger.log(`Supabase [${ref}] SQL 마이그레이션 실행 (${sql.length}자)`);

    if (!sql.trim()) {
      this.logger.warn(`Supabase [${ref}] SQL이 비어있습니다`);
      return;
    }

    // 최대 3회 재시도
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // Supabase Management API: /database/query 엔드포인트에 query 필드
        await this.apiCall('POST', `/v1/projects/${ref}/database/query`, {
          query: sql,
        });
        this.logger.log(`Supabase [${ref}] SQL 마이그레이션 완료`);
        return;
      } catch (error: any) {
        this.logger.warn(`Supabase [${ref}] 마이그레이션 실패 (시도 ${attempt + 1}/3): ${error.message}`);
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw new Error(`SQL 마이그레이션 최종 실패: ${error.message}`);
        }
      }
    }
  }

  /**
   * 전체 프로비저닝 플로우
   * 1. 프로젝트 생성
   * 2. ACTIVE_HEALTHY 대기
   * 3. API 키 조회
   * 4. SQL 마이그레이션 실행
   * 5. DB에 저장
   */
  async provisionForProject(
    projectId: string,
    appName: string,
    sql: string,
  ): Promise<{
    success: boolean;
    supabaseUrl?: string;
    supabaseAnonKey?: string;
    error?: string;
  }> {
    if (!this.enabled) {
      this.logger.warn('Supabase 프로비저닝 건너뜀 (미설정)');
      return { success: false, error: 'Supabase 미설정' };
    }

    try {
      // DB에 상태 저장: creating
      await this.prisma.project.update({
        where: { id: projectId },
        data: { supabaseStatus: 'creating' },
      });

      // 1. 프로젝트 생성
      const project = await this.createProject(appName);
      const ref = project.ref || project.id;
      const dbPass = (project as any)._dbPass;

      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          supabaseProjectRef: ref,
          supabaseDbPass: dbPass,
        },
      });

      // 2. ACTIVE_HEALTHY 대기 (최대 3분)
      const ready = await this.waitForReady(ref, 180000);
      if (!ready) {
        await this.prisma.project.update({
          where: { id: projectId },
          data: { supabaseStatus: 'failed' },
        });
        return { success: false, error: 'Supabase 프로젝트 준비 시간 초과 (3분)' };
      }

      // 3. API 키 조회
      const { anonKey, serviceKey } = await this.getApiKeys(ref);
      const supabaseUrl = `https://${ref}.supabase.co`;

      // 4. SQL 마이그레이션 실행
      await this.runMigration(ref, sql);

      // 5. DB에 최종 저장
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          supabaseUrl,
          supabaseAnonKey: anonKey,
          supabaseServiceKey: serviceKey,
          supabaseStatus: 'active',
        },
      });

      this.logger.log(`✅ Supabase 프로비저닝 완료: ${supabaseUrl}`);

      return {
        success: true,
        supabaseUrl,
        supabaseAnonKey: anonKey,
      };
    } catch (error: any) {
      this.logger.error(`Supabase 프로비저닝 실패: ${error.message}`);

      await this.prisma.project.update({
        where: { id: projectId },
        data: { supabaseStatus: 'failed' },
      }).catch(() => {});

      return { success: false, error: error.message };
    }
  }

  /**
   * Supabase Storage 버킷 생성 + RLS 정책 설정
   * hasFileUpload === true인 프로젝트에서 자동 호출
   */
  async createStorageBucket(
    projectRef: string,
    bucketName: string = 'uploads',
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.enabled || !projectRef) {
      return { success: false, error: 'Supabase 미설정 또는 projectRef 없음' };
    }

    try {
      // 1) Storage 버킷 생성 (공개 접근 허용)
      await this.apiCall('POST', `/v1/projects/${projectRef}/storage/buckets`, {
        id: bucketName,
        name: bucketName,
        public: true,
        file_size_limit: 5242880, // 5MB
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
      });

      // 2) Storage RLS 정책 — 인증 사용자 업로드/조회 허용
      const storagePolicySql = `
-- Storage RLS: 인증 사용자 파일 업로드 허용
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = '${bucketName}');

-- Storage RLS: 공개 읽기 허용
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = '${bucketName}');

-- Storage RLS: 본인 파일 삭제 허용
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = '${bucketName}' AND auth.uid()::text = (storage.foldername(name))[1]);
`;

      await this.runMigration(projectRef, storagePolicySql);

      this.logger.log(`✅ Storage 버킷 '${bucketName}' 생성 완료 (${projectRef})`);
      return { success: true };
    } catch (error: any) {
      // 버킷이 이미 존재하면 무시
      if (error.message?.includes('already exists') || error.message?.includes('409')) {
        this.logger.log(`Storage 버킷 '${bucketName}' 이미 존재 — 건너뜀`);
        return { success: true };
      }
      this.logger.error(`Storage 버킷 생성 실패: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
