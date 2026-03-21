import { Injectable, Inject, forwardRef, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

/** 빌드 소스 디렉토리 (npm install + next build 실행 장소) */
const PROJECTS_DIR = path.resolve(process.env.PROJECTS_DIR || '/tmp/launchpad-projects');
/** Static Export 결과물 서빙 디렉토리 (nginx가 읽는 곳) */
const DEPLOY_DIR = path.resolve(process.env.DEPLOY_DIR || '/var/www/apps');
/** 배포 도메인 */
const DEPLOY_DOMAIN = process.env.DEPLOY_DOMAIN || 'foundry.ai.kr';
/** 빌드 타임아웃 (ms) */
const BUILD_TIMEOUT = 5 * 60 * 1000; // 5분
/** F6: 빌드 자동 수정 최대 시도 횟수 */
const MAX_BUILD_FIX_ATTEMPTS = 3;

@Injectable()
export class DeployService {
  private readonly logger = new Logger(DeployService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AiService)) private aiService: AiService,
  ) {}

  /**
   * 서브도메인 자동 할당 (프로젝트명 기반, 영문+숫자만)
   */
  private generateSubdomain(name: string, userId: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[가-힣]/g, '') // 한글 제거 (DNS 호환)
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20) || 'app';
    const hash = crypto.createHash('md5').update(userId).digest('hex').slice(0, 4);
    return `${slug}-${hash}`;
  }

  /**
   * 프로젝트 코드 저장 (generatedCode → 파일시스템)
   */
  async saveProjectFiles(projectId: string, userId: string): Promise<{ outputDir: string; fileCount: number }> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new ForbiddenException();
    if (!project.generatedCode) throw new BadRequestException('생성된 코드가 없습니다. 먼저 앱을 생성하세요.');

    const outputDir = path.join(PROJECTS_DIR, projectId);

    // 기존 파일 정리 후 새로 쓰기
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });

    const files = project.generatedCode as { path: string; content: string }[];
    let fileCount = 0;

    for (const file of files) {
      const filePath = path.join(outputDir, file.path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.content, 'utf-8');
      fileCount++;
    }

    // next.config 자동 보정 (output: 'export' 보장)
    this.ensureNextConfig(outputDir);
    // package.json 보정 (의존성 보장)
    this.ensurePackageJson(outputDir, project.name);

    return { outputDir, fileCount };
  }

  /**
   * next.config.ts에 output: 'export' 보장
   */
  private ensureNextConfig(outputDir: string) {
    const configTs = path.join(outputDir, 'next.config.ts');
    const configJs = path.join(outputDir, 'next.config.js');
    const configMjs = path.join(outputDir, 'next.config.mjs');

    // 기존 설정 파일 확인
    let configPath = '';
    if (fs.existsSync(configTs)) configPath = configTs;
    else if (fs.existsSync(configJs)) configPath = configJs;
    else if (fs.existsSync(configMjs)) configPath = configMjs;

    if (configPath) {
      let content = fs.readFileSync(configPath, 'utf-8');
      // output: 'export'가 없으면 추가
      if (!content.includes("output:") && !content.includes("output :")) {
        // 다양한 패턴 지원: `const nextConfig = {`, `const nextConfig: NextConfig = {`, etc.
        const replaced = content.replace(
          /(const\s+nextConfig[\s\S]*?=\s*\{)/,
          `$1\n  output: 'export',`,
        );
        content = replaced !== content ? replaced : content;
      }
      // images.unoptimized 보장 (static export에서 Image 컴포넌트 사용 시)
      if (!content.includes('unoptimized')) {
        content = content.replace(
          /images:\s*\{[^}]*\}/,
          `images: { unoptimized: true }`,
        );
        // images 설정 자체가 없는 경우
        if (!content.includes('images')) {
          content = content.replace(
            /(output:\s*'export',?)/,
            `$1\n  images: { unoptimized: true },`,
          );
        }
      }
      fs.writeFileSync(configPath, content, 'utf-8');
    } else {
      // 설정 파일이 아예 없으면 생성
      const config = `import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
`;
      fs.writeFileSync(configTs, config, 'utf-8');
    }
  }

  /**
   * package.json 보정 — 빌드에 필요한 의존성 보장
   */
  private ensurePackageJson(outputDir: string, projectName: string) {
    const pkgPath = path.join(outputDir, 'package.json');
    let pkg: any = {};

    if (fs.existsSync(pkgPath)) {
      try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')); } catch { /* 파싱 실패 시 새로 생성 */ }
    }

    const deps = pkg.dependencies || {};
    const devDeps = pkg.devDependencies || {};

    // 필수 의존성 보장
    if (!deps.next) deps.next = '^16.0.0';
    if (!deps.react) deps.react = '^19.0.0';
    if (!deps['react-dom']) deps['react-dom'] = '^19.0.0';
    // Supabase SDK (생성된 코드가 사용하는 경우)
    const allContent = this.getAllFileContent(outputDir);
    if (allContent.includes('@supabase/supabase-js') && !deps['@supabase/supabase-js']) {
      deps['@supabase/supabase-js'] = '^2.49.0';
    }
    if (allContent.includes('@supabase/ssr') && !deps['@supabase/ssr']) {
      deps['@supabase/ssr'] = '^0.6.0';
    }

    // devDependencies
    if (!devDeps.typescript && !deps.typescript) devDeps.typescript = '^5.0.0';
    if (!devDeps['@types/react'] && !deps['@types/react']) devDeps['@types/react'] = '^19.0.0';
    if (!devDeps['@types/node'] && !deps['@types/node']) devDeps['@types/node'] = '^22.0.0';

    pkg.name = pkg.name || projectName.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'foundry-app';
    pkg.version = pkg.version || '1.0.0';
    pkg.private = true;
    pkg.scripts = {
      ...pkg.scripts,
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
    };
    pkg.dependencies = deps;
    pkg.devDependencies = devDeps;

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
  }

  /** 프로젝트 내 모든 소스 파일의 내용을 합쳐서 반환 (의존성 감지용) */
  private getAllFileContent(dir: string): string {
    let content = '';
    const walk = (d: string) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.next') continue;
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          content += fs.readFileSync(full, 'utf-8') + '\n';
        }
      }
    };
    try { walk(dir); } catch { /* ignore */ }
    return content;
  }

  /**
   * ═══════════════════════════════════════════════════════
   * 메인 배포 파이프라인: 파일 저장 → npm install → next build → static 배포
   * ═══════════════════════════════════════════════════════
   */
  async deploy(projectId: string, userId: string): Promise<{
    subdomain: string;
    deployedUrl: string;
    status: string;
    buildStatus: string;
  }> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new ForbiddenException();
    if (project.status !== 'active' && project.status !== 'deployed') {
      throw new BadRequestException('앱 생성이 완료된 프로젝트만 배포할 수 있습니다.');
    }
    if (!project.generatedCode) {
      throw new BadRequestException('생성된 코드가 없습니다. 먼저 앱을 생성하세요.');
    }

    // 서브도메인 할당 (이미 있으면 재사용)
    const subdomain = project.subdomain || this.generateSubdomain(project.name, userId);
    const deployedUrl = `https://${subdomain}.${DEPLOY_DOMAIN}`;

    // Step 1: buildStatus = pending
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        subdomain,
        deployedUrl,
        buildStatus: 'pending',
        buildLog: null,
        buildStartedAt: new Date(),
        buildFinishedAt: null,
      },
    });

    // Step 2: 비동기 빌드 시작 (API 응답은 즉시 반환)
    this.buildAndDeploy(projectId, userId, subdomain).catch(err => {
      this.logger.error(`빌드 실패 [${projectId}]: ${err.message}`);
    });

    return {
      subdomain,
      deployedUrl,
      status: 'deployed',
      buildStatus: 'pending',
    };
  }

  /**
   * 실제 빌드+배포 (백그라운드)
   */
  private async buildAndDeploy(projectId: string, userId: string, subdomain: string): Promise<void> {
    const log: string[] = [];
    const appendLog = (msg: string) => {
      this.logger.log(`[${projectId}] ${msg}`);
      log.push(`[${new Date().toISOString()}] ${msg}`);
    };

    try {
      // ── Step 1: 파일 저장 ──
      await this.prisma.project.update({
        where: { id: projectId },
        data: { buildStatus: 'building' },
      });
      appendLog('파일 저장 시작...');
      const { outputDir, fileCount } = await this.saveProjectFiles(projectId, userId);
      appendLog(`파일 ${fileCount}개 저장 완료 → ${outputDir}`);

      // ── Step 2: npm install ──
      appendLog('npm install 시작...');
      try {
        execSync('npm install --legacy-peer-deps 2>&1', {
          cwd: outputDir,
          timeout: BUILD_TIMEOUT,
          env: { ...process.env, NODE_ENV: 'production' },
          stdio: 'pipe',
        });
        appendLog('npm install 완료');
      } catch (e: any) {
        const stderr = e.stderr?.toString() || e.stdout?.toString() || e.message;
        appendLog(`npm install 실패: ${stderr.slice(0, 500)}`);
        throw new Error(`npm install 실패: ${stderr.slice(0, 200)}`);
      }

      // ── Step 2.5: 빌드 전 자동 수정 ──
      // TypeScript 패키지 보장
      try {
        execSync('npm install --save-dev typescript @types/react @types/node --legacy-peer-deps 2>&1', {
          cwd: outputDir, timeout: 60000, stdio: 'pipe',
        });
        appendLog('TypeScript 패키지 설치 완료');
      } catch { /* 이미 있으면 무시 */ }

      // JSX가 포함된 .ts 파일을 .tsx로 리네임
      const tsFiles = this.findFilesRecursive(outputDir, /\.ts$/);
      for (const tsFile of tsFiles) {
        if (tsFile.endsWith('.d.ts')) continue;
        try {
          const content = fs.readFileSync(tsFile, 'utf-8');
          if (content.includes('<div') || content.includes('<span') || content.includes('<button') ||
              content.includes('return (') || content.includes('React.FC') || content.includes('JSX')) {
            const newPath = tsFile.replace(/\.ts$/, '.tsx');
            fs.renameSync(tsFile, newPath);
            appendLog(`JSX 파일 리네임: ${path.basename(tsFile)} → ${path.basename(newPath)}`);
          }
        } catch { /* 개별 파일 실패 무시 */ }
      }

      // ── Step 3: next build (output: 'export') + F6 자동 수정 루프 ──
      await this.prisma.project.update({
        where: { id: projectId },
        data: { buildStatus: 'exporting' },
      });

      const supabaseEnv = await this.getSupabaseEnv(projectId);
      let buildSuccess = false;

      for (let attempt = 0; attempt <= MAX_BUILD_FIX_ATTEMPTS; attempt++) {
        appendLog(attempt === 0 ? 'next build 시작...' : `next build 재시도 (${attempt}/${MAX_BUILD_FIX_ATTEMPTS})...`);
        try {
          execSync('npx next build 2>&1', {
            cwd: outputDir,
            timeout: BUILD_TIMEOUT,
            env: { ...process.env, NODE_ENV: 'production', ...supabaseEnv },
            stdio: 'pipe',
          });
          appendLog('next build 완료 (static export)');
          buildSuccess = true;
          break;
        } catch (e: any) {
          const stderr = e.stderr?.toString() || e.stdout?.toString() || e.message;
          const errorLog = stderr.slice(0, 2000);
          appendLog(`next build 실패 (시도 ${attempt + 1}): ${errorLog.slice(0, 300)}`);

          if (attempt >= MAX_BUILD_FIX_ATTEMPTS) {
            throw new Error(`next build 실패 (${MAX_BUILD_FIX_ATTEMPTS}회 자동 수정 후에도 실패): ${errorLog.slice(0, 200)}`);
          }

          // F6: AI 자동 수정 시도
          appendLog(`[F6] AI 자동 수정 시도 (${attempt + 1}/${MAX_BUILD_FIX_ATTEMPTS})...`);
          await this.prisma.project.update({
            where: { id: projectId },
            data: { buildStatus: 'fixing' },
          });

          try {
            const fixed = await this.aiBuildFix(projectId, userId, outputDir, errorLog);
            if (fixed) {
              appendLog(`[F6] AI가 ${fixed}개 파일 수정 완료 → 재빌드`);
            } else {
              appendLog('[F6] AI 수정 불가 — 재시도 중단');
              throw new Error(`next build 실패 (AI 수정 불가): ${errorLog.slice(0, 200)}`);
            }
          } catch (fixErr: any) {
            if (fixErr.message?.includes('AI 수정 불가')) throw fixErr;
            appendLog(`[F6] AI 수정 오류: ${fixErr.message?.slice(0, 200)}`);
          }
        }
      }

      if (!buildSuccess) {
        throw new Error('next build 실패: 모든 자동 수정 시도 소진');
      }

      // ── Step 4: out/ 디렉토리를 DEPLOY_DIR/{subdomain}/ 으로 복사 ──
      const outDir = path.join(outputDir, 'out');
      if (!fs.existsSync(outDir)) {
        throw new Error('next build 결과물(out/)이 생성되지 않았습니다. next.config에 output: "export" 확인 필요.');
      }

      const deployTarget = path.join(DEPLOY_DIR, subdomain);
      if (fs.existsSync(deployTarget)) {
        fs.rmSync(deployTarget, { recursive: true, force: true });
      }
      fs.mkdirSync(DEPLOY_DIR, { recursive: true });
      // cp -r out/ → deployTarget
      execSync(`cp -r "${outDir}" "${deployTarget}"`, { timeout: 30000 });
      appendLog(`Static 파일 배포 완료 → ${deployTarget}`);

      // ── Step 5: 소스 정리 (디스크 절약) ──
      const nodeModules = path.join(outputDir, 'node_modules');
      const nextCache = path.join(outputDir, '.next');
      if (fs.existsSync(nodeModules)) fs.rmSync(nodeModules, { recursive: true, force: true });
      if (fs.existsSync(nextCache)) fs.rmSync(nextCache, { recursive: true, force: true });
      appendLog('빌드 캐시 정리 완료');

      // ── 완료 ──
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          status: 'deployed',
          buildStatus: 'done',
          buildLog: log.join('\n'),
          buildFinishedAt: new Date(),
        },
      });
      appendLog('배포 완료!');

    } catch (err: any) {
      log.push(`[ERROR] ${err.message}`);
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          buildStatus: 'failed',
          buildLog: log.join('\n'),
          buildFinishedAt: new Date(),
        },
      });
    }
  }

  /**
   * F6: AI 빌드 에러 자동 수정
   * 빌드 에러 로그를 분석하여 문제 파일을 AI로 수정
   */
  private previousErrors: string[] = [];

  private async aiBuildFix(projectId: string, userId: string, outputDir: string, errorLog: string): Promise<number> {
    // 에러 로그에서 파일 경로 추출 (app/, components/, lib/, src/, pages/ 등 모든 경로)
    const errorFileRegex = /(?:\.\/|src\/|pages\/|app\/|components\/|lib\/)([^\s:]+\.(?:tsx?|jsx?))/g;
    const errorFiles = new Set<string>();
    let match;
    while ((match = errorFileRegex.exec(errorLog)) !== null) {
      errorFiles.add(match[1]);
    }

    // 추가: 파일명:라인 패턴도 잡기 (예: "sales/page.tsx:69:58")
    const fileLineRegex = /([a-zA-Z0-9_\-/]+\.(?:tsx?|jsx?)):\d+:\d+/g;
    while ((match = fileLineRegex.exec(errorLog)) !== null) {
      errorFiles.add(match[1]);
    }

    // BUG-2: 동일 에러 반복 감지
    const errorSignature = [...errorFiles].sort().join('|') + '::' + errorLog.slice(0, 200);
    const isRepeatError = this.previousErrors.includes(errorSignature);
    this.previousErrors.push(errorSignature);

    // 프로젝트의 generatedCode 로드
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { generatedCode: true, modelUsed: true },
    });
    if (!project?.generatedCode) return 0;

    const files = project.generatedCode as { path: string; content: string }[];

    // 에러 파일 매칭: 정규식 추출 결과 또는 에러 로그 내 파일명 직접 검색
    let targetFiles = files.filter(f => [...errorFiles].some(ef => f.path.includes(ef)));

    // 동일 에러 반복이거나 매칭 실패 시 → 에러 로그에 언급된 파일명을 generatedCode에서 직접 검색
    if (targetFiles.length === 0 || isRepeatError) {
      const allTsx = files.filter(f => f.path.match(/\.(tsx?)$/));
      // 에러 로그에서 파일명 힌트 추출 (경로 없이 파일명만)
      const fileNameHints = errorLog.match(/[a-zA-Z0-9_\-]+\.tsx?/g) || [];
      const hintMatched = allTsx.filter(f => fileNameHints.some(h => f.path.endsWith(h)));
      targetFiles = hintMatched.length > 0 ? hintMatched : allTsx.slice(0, 5);
    }

    if (targetFiles.length === 0) return 0;

    const tier = (project.modelUsed as any) || 'flash';

    // F4+F6 연계: 잘린 파일 감지 → 먼저 이어서 생성으로 완성한 후 빌드 수정
    for (let i = 0; i < targetFiles.length; i++) {
      if (targetFiles[i].path.match(/\.(tsx?|jsx?)$/) && this.aiService.isCodeTruncated(targetFiles[i].content)) {
        this.logger.warn(`[F6+F4] 잘린 파일 감지: ${targetFiles[i].path} → 이어서 생성 시도`);
        const completed = await this.aiService.continueGeneration(
          tier as any,
          '당신은 Next.js 16 + Supabase 풀스택 전문가입니다. TypeScript + Tailwind CSS를 사용합니다.',
          targetFiles[i].content,
          targetFiles[i].path,
        );
        targetFiles[i] = { ...targetFiles[i], content: completed };

        // 완성된 코드를 파일시스템 + DB에 즉시 반영
        const filePath = path.join(outputDir, targetFiles[i].path);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, completed, 'utf-8');

        const idx = files.findIndex(f => f.path === targetFiles[i].path);
        if (idx >= 0) files[idx] = targetFiles[i];

        await this.prisma.project.update({
          where: { id: projectId },
          data: { generatedCode: files as any },
        });
      }
    }

    // AI에게 수정 요청
    const modifyResult = await this.aiService.fixBuildErrors(tier, targetFiles, errorLog);

    if (!modifyResult || modifyResult.length === 0) return 0;

    // 수정된 파일을 파일시스템에 적용
    let fixedCount = 0;
    const updatedFiles = [...files];
    for (const fixed of modifyResult) {
      // 파일시스템에 쓰기
      const filePath = path.join(outputDir, fixed.path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, fixed.content, 'utf-8');
      fixedCount++;

      // generatedCode에도 반영
      const idx = updatedFiles.findIndex(f => f.path === fixed.path);
      if (idx >= 0) updatedFiles[idx] = fixed;
      else updatedFiles.push(fixed);
    }

    // DB 업데이트
    await this.prisma.project.update({
      where: { id: projectId },
      data: { generatedCode: updatedFiles as any },
    });

    return fixedCount;
  }

  /** 디렉토리에서 패턴 매칭 파일 재귀 탐색 */
  private findFilesRecursive(dir: string, pattern: RegExp): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
        results.push(...this.findFilesRecursive(fullPath, pattern));
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
    return results;
  }

  /**
   * Supabase 환경변수 가져오기 (빌드 시 주입)
   */
  private async getSupabaseEnv(projectId: string): Promise<Record<string, string>> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { supabaseUrl: true, supabaseAnonKey: true },
    });
    if (!project?.supabaseUrl) return {};
    return {
      NEXT_PUBLIC_SUPABASE_URL: project.supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: project.supabaseAnonKey || '',
    };
  }

  /**
   * 빌드 상태 조회 (프론트에서 폴링)
   */
  async getBuildStatus(projectId: string, userId: string): Promise<{
    buildStatus: string | null;
    buildLog: string | null;
    deployedUrl: string | null;
    subdomain: string | null;
  }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true, buildStatus: true, buildLog: true, deployedUrl: true, subdomain: true },
    });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new ForbiddenException();
    return {
      buildStatus: project.buildStatus,
      buildLog: project.buildLog,
      deployedUrl: project.deployedUrl,
      subdomain: project.subdomain,
    };
  }

  /**
   * ZIP 매니페스트 조회 (프론트에서 JSZip으로 조립)
   */
  async getDownloadManifest(projectId: string, userId: string): Promise<{
    projectName: string;
    template: string;
    theme: string;
    files: { path: string; content: string }[];
  }> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new ForbiddenException();

    const files = (project.generatedCode as { path: string; content: string }[] | null)
      || this.getDemoFiles(project.template, project.name);

    return {
      projectName: project.name,
      template: project.template,
      theme: project.theme,
      files,
    };
  }

  /**
   * 데모 파일 생성 (AI 생성 전 템플릿 기본 코드)
   */
  private getDemoFiles(template: string, projectName: string): { path: string; content: string }[] {
    const baseFiles = [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: projectName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          version: '1.0.0',
          private: true,
          scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
          dependencies: { next: '^16.0.0', react: '^19.0.0', 'react-dom': '^19.0.0', typescript: '^5.0.0', tailwindcss: '^4.0.0' },
        }, null, 2),
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({ compilerOptions: { target: 'es2017', lib: ['dom', 'es2017'], jsx: 'preserve', module: 'esnext', moduleResolution: 'bundler', strict: true, paths: { '@/*': ['./src/*'] } }, include: ['**/*.ts', '**/*.tsx'], exclude: ['node_modules'] }, null, 2),
      },
      {
        path: 'next.config.ts',
        content: `import type { NextConfig } from 'next';\n\nconst nextConfig: NextConfig = {\n  output: 'export',\n  images: { unoptimized: true },\n};\n\nexport default nextConfig;\n`,
      },
      {
        path: 'src/app/layout.tsx',
        content: `import type { Metadata } from 'next';\nimport './globals.css';\n\nexport const metadata: Metadata = { title: '${projectName}', description: 'Foundry로 생성된 앱' };\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return <html lang="ko"><body>{children}</body></html>;\n}`,
      },
      {
        path: 'src/app/globals.css',
        content: '@import "tailwindcss";',
      },
      { path: 'README.md', content: `# ${projectName}\n\nFoundry AI MVP 빌더로 생성된 프로젝트입니다.\n\n## 실행 방법\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## 기술 스택\n- Next.js 16 + TypeScript\n- Tailwind CSS\n- Supabase (인증 + DB)\n` },
    ];

    const templatePages: Record<string, { path: string; content: string }[]> = {
      'beauty-salon': [
        { path: 'src/app/page.tsx', content: `'use client';\n\nexport default function Home() {\n  return (\n    <div className="min-h-screen bg-slate-50 p-6">\n      <h1 className="text-2xl font-bold mb-6">${projectName}</h1>\n      <div className="grid grid-cols-2 gap-4 mb-6">\n        <div className="bg-white rounded-xl p-4 shadow-sm">\n          <p className="text-sm text-gray-500">오늘 매출</p>\n          <p className="text-2xl font-bold">\\u20A90</p>\n        </div>\n        <div className="bg-white rounded-xl p-4 shadow-sm">\n          <p className="text-sm text-gray-500">오늘 예약</p>\n          <p className="text-2xl font-bold">0건</p>\n        </div>\n      </div>\n    </div>\n  );\n}` },
      ],
      'booking-crm': [
        { path: 'src/app/page.tsx', content: `'use client';\n\nexport default function Home() {\n  return (\n    <div className="min-h-screen bg-green-50 p-6">\n      <h1 className="text-2xl font-bold mb-6">${projectName}</h1>\n      <div className="grid grid-cols-2 gap-4">\n        <div className="bg-white rounded-xl p-4 shadow-sm">\n          <p className="text-sm text-gray-500">오늘 예약</p>\n          <p className="text-2xl font-bold">0건</p>\n        </div>\n      </div>\n    </div>\n  );\n}` },
      ],
      'ecommerce': [
        { path: 'src/app/page.tsx', content: `'use client';\n\nexport default function Home() {\n  return (\n    <div className="min-h-screen">\n      <header className="bg-slate-800 text-white p-4"><span className="font-bold">${projectName}</span></header>\n      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-10 text-center">\n        <h1 className="text-3xl font-bold">GRAND OPEN</h1>\n      </div>\n    </div>\n  );\n}` },
      ],
    };

    return [...baseFiles, ...(templatePages[template] || templatePages['booking-crm'])];
  }
}
