import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const PROJECTS_DIR = path.resolve(process.env.PROJECTS_DIR || '/tmp/launchpad-projects');

@Injectable()
export class DeployService {
  constructor(private prisma: PrismaService) {}

  /**
   * 서브도메인 자동 할당 (프로젝트명 기반)
   */
  private generateSubdomain(name: string, userId: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20);
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
    fs.mkdirSync(outputDir, { recursive: true });

    const files = project.generatedCode as { path: string; content: string }[];
    let fileCount = 0;

    for (const file of files) {
      const filePath = path.join(outputDir, file.path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.content, 'utf-8');
      fileCount++;
    }

    return { outputDir, fileCount };
  }

  /**
   * 서브도메인 할당 + 배포 상태 업데이트
   */
  async deploy(projectId: string, userId: string): Promise<{
    subdomain: string;
    deployedUrl: string;
    status: string;
  }> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new ForbiddenException();
    if (project.status !== 'active' && project.status !== 'deployed') {
      throw new BadRequestException('앱 생성이 완료된 프로젝트만 배포할 수 있습니다.');
    }

    // 서브도메인 할당 (이미 있으면 재사용)
    const subdomain = project.subdomain || this.generateSubdomain(project.name, userId);

    // 코드 저장
    if (project.generatedCode) {
      await this.saveProjectFiles(projectId, userId);
    }

    // DB 업데이트
    const deployedUrl = `https://${subdomain}.launchpad.kr`;
    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        subdomain,
        deployedUrl,
        status: 'deployed',
      },
    });

    return {
      subdomain: updated.subdomain!,
      deployedUrl: updated.deployedUrl!,
      status: updated.status,
    };
  }

  /**
   * ZIP 파일 생성 (생성된 코드를 ZIP으로 패키징)
   */
  async generateZip(projectId: string, userId: string): Promise<{ zipPath: string; fileName: string }> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new ForbiddenException();

    // generatedCode가 없으면 데모 코드 생성
    const files = (project.generatedCode as { path: string; content: string }[] | null) || this.getDemoFiles(project.template, project.name);

    const zipDir = path.join(PROJECTS_DIR, 'zips');
    fs.mkdirSync(zipDir, { recursive: true });

    const fileName = `${project.name.replace(/[^a-zA-Z0-9가-힣_-]/g, '_')}.zip`;
    const zipPath = path.join(zipDir, `${projectId}.zip`);

    // archiver 없이 tar.gz 대신 간단한 구조체로 ZIP 생성
    // 실제로는 archiver 패키지 사용하지만, 의존성 최소화를 위해
    // 파일 목록과 내용을 JSON으로 저장 → 프론트에서 JSZip으로 조립
    const manifest = {
      projectName: project.name,
      template: project.template,
      theme: project.theme,
      files,
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(zipPath, JSON.stringify(manifest, null, 2), 'utf-8');

    return { zipPath, fileName };
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

    const files = (project.generatedCode as { path: string; content: string }[] | null) || this.getDemoFiles(project.template, project.name);

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
        path: 'src/app/layout.tsx',
        content: `import type { Metadata } from 'next';\nimport './globals.css';\n\nexport const metadata: Metadata = { title: '${projectName}', description: 'Launchpad로 생성된 앱' };\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return <html lang="ko"><body>{children}</body></html>;\n}`,
      },
      {
        path: 'src/app/globals.css',
        content: '@import "tailwindcss";',
      },
      { path: 'README.md', content: `# ${projectName}\n\nLaunchpad AI MVP 빌더로 생성된 프로젝트입니다.\n\n## 실행 방법\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## 기술 스택\n- Next.js 16 + TypeScript\n- Tailwind CSS\n- NestJS + Prisma (백엔드)\n` },
    ];

    const templatePages: Record<string, { path: string; content: string }[]> = {
      'beauty-salon': [
        { path: 'src/app/page.tsx', content: `'use client';\n\nexport default function Home() {\n  return (\n    <div className="min-h-screen bg-slate-50 p-6">\n      <h1 className="text-2xl font-bold mb-6">💇 ${projectName}</h1>\n      <div className="grid grid-cols-2 gap-4 mb-6">\n        <div className="bg-white rounded-xl p-4 shadow-sm">\n          <p className="text-sm text-gray-500">오늘 매출</p>\n          <p className="text-2xl font-bold">₩0</p>\n        </div>\n        <div className="bg-white rounded-xl p-4 shadow-sm">\n          <p className="text-sm text-gray-500">오늘 예약</p>\n          <p className="text-2xl font-bold">0건</p>\n        </div>\n      </div>\n      <div className="bg-white rounded-xl p-4 shadow-sm">\n        <h2 className="font-semibold mb-3">예약 현황</h2>\n        <p className="text-gray-400 text-sm">아직 예약이 없습니다.</p>\n      </div>\n    </div>\n  );\n}` },
        { path: 'src/app/reservations/page.tsx', content: `'use client';\n\nexport default function ReservationsPage() {\n  return <div className="p-6"><h1 className="text-xl font-bold">📅 예약 관리</h1></div>;\n}` },
        { path: 'src/app/customers/page.tsx', content: `'use client';\n\nexport default function CustomersPage() {\n  return <div className="p-6"><h1 className="text-xl font-bold">👥 고객 관리</h1></div>;\n}` },
      ],
      'booking-crm': [
        { path: 'src/app/page.tsx', content: `'use client';\n\nexport default function Home() {\n  return (\n    <div className="min-h-screen bg-green-50 p-6">\n      <h1 className="text-2xl font-bold mb-6">🏥 ${projectName}</h1>\n      <div className="grid grid-cols-2 gap-4 mb-6">\n        <div className="bg-white rounded-xl p-4 shadow-sm">\n          <p className="text-sm text-gray-500">오늘 예약</p>\n          <p className="text-2xl font-bold">0건</p>\n        </div>\n        <div className="bg-white rounded-xl p-4 shadow-sm">\n          <p className="text-sm text-gray-500">온라인 예약률</p>\n          <p className="text-2xl font-bold">0%</p>\n        </div>\n      </div>\n    </div>\n  );\n}` },
        { path: 'src/app/bookings/page.tsx', content: `'use client';\n\nexport default function BookingsPage() {\n  return <div className="p-6"><h1 className="text-xl font-bold">📅 예약 목록</h1></div>;\n}` },
      ],
      'ecommerce': [
        { path: 'src/app/page.tsx', content: `'use client';\n\nexport default function Home() {\n  return (\n    <div className="min-h-screen">\n      <header className="bg-slate-800 text-white p-4 flex justify-between"><span className="font-bold">🛍 ${projectName}</span><span>🛒 0</span></header>\n      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-10 text-center">\n        <h1 className="text-3xl font-bold">GRAND OPEN</h1>\n        <p className="mt-2 opacity-80">최대 30% 할인</p>\n      </div>\n      <div className="p-4">\n        <h2 className="font-semibold mb-3">인기 상품</h2>\n        <p className="text-gray-400 text-sm">상품을 등록해주세요.</p>\n      </div>\n    </div>\n  );\n}` },
        { path: 'src/app/products/page.tsx', content: `'use client';\n\nexport default function ProductsPage() {\n  return <div className="p-6"><h1 className="text-xl font-bold">📦 상품 관리</h1></div>;\n}` },
      ],
    };

    return [...baseFiles, ...(templatePages[template] || templatePages['booking-crm'])];
  }
}
