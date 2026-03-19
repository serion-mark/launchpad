"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeployService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const PROJECTS_DIR = path.resolve(process.env.PROJECTS_DIR || '/tmp/launchpad-projects');
let DeployService = class DeployService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    generateSubdomain(name, userId) {
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9가-힣]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 20);
        const hash = crypto.createHash('md5').update(userId).digest('hex').slice(0, 4);
        return `${slug}-${hash}`;
    }
    async saveProjectFiles(projectId, userId) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project)
            throw new common_1.NotFoundException('프로젝트를 찾을 수 없습니다');
        if (project.userId !== userId)
            throw new common_1.ForbiddenException();
        if (!project.generatedCode)
            throw new common_1.BadRequestException('생성된 코드가 없습니다. 먼저 앱을 생성하세요.');
        const outputDir = path.join(PROJECTS_DIR, projectId);
        fs.mkdirSync(outputDir, { recursive: true });
        const files = project.generatedCode;
        let fileCount = 0;
        for (const file of files) {
            const filePath = path.join(outputDir, file.path);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, file.content, 'utf-8');
            fileCount++;
        }
        return { outputDir, fileCount };
    }
    async deploy(projectId, userId) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project)
            throw new common_1.NotFoundException('프로젝트를 찾을 수 없습니다');
        if (project.userId !== userId)
            throw new common_1.ForbiddenException();
        if (project.status !== 'active' && project.status !== 'deployed') {
            throw new common_1.BadRequestException('앱 생성이 완료된 프로젝트만 배포할 수 있습니다.');
        }
        const subdomain = project.subdomain || this.generateSubdomain(project.name, userId);
        if (project.generatedCode) {
            await this.saveProjectFiles(projectId, userId);
        }
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
            subdomain: updated.subdomain,
            deployedUrl: updated.deployedUrl,
            status: updated.status,
        };
    }
    async generateZip(projectId, userId) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project)
            throw new common_1.NotFoundException('프로젝트를 찾을 수 없습니다');
        if (project.userId !== userId)
            throw new common_1.ForbiddenException();
        const files = project.generatedCode || this.getDemoFiles(project.template, project.name);
        const zipDir = path.join(PROJECTS_DIR, 'zips');
        fs.mkdirSync(zipDir, { recursive: true });
        const fileName = `${project.name.replace(/[^a-zA-Z0-9가-힣_-]/g, '_')}.zip`;
        const zipPath = path.join(zipDir, `${projectId}.zip`);
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
    async getDownloadManifest(projectId, userId) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project)
            throw new common_1.NotFoundException('프로젝트를 찾을 수 없습니다');
        if (project.userId !== userId)
            throw new common_1.ForbiddenException();
        const files = project.generatedCode || this.getDemoFiles(project.template, project.name);
        return {
            projectName: project.name,
            template: project.template,
            theme: project.theme,
            files,
        };
    }
    getDemoFiles(template, projectName) {
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
        const templatePages = {
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
};
exports.DeployService = DeployService;
exports.DeployService = DeployService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DeployService);
//# sourceMappingURL=deploy.service.js.map