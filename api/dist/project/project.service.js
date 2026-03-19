"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let ProjectService = class ProjectService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(userId) {
        return this.prisma.project.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                name: true,
                description: true,
                template: true,
                theme: true,
                status: true,
                subdomain: true,
                deployedUrl: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
    async getById(id, userId) {
        const project = await this.prisma.project.findUnique({ where: { id } });
        if (!project)
            throw new common_1.NotFoundException('프로젝트를 찾을 수 없습니다');
        if (project.userId !== userId)
            throw new common_1.ForbiddenException();
        return project;
    }
    async create(userId, data) {
        return this.prisma.project.create({
            data: {
                name: data.name,
                description: data.description,
                template: data.template,
                theme: data.theme || 'basic-light',
                features: data.features ?? undefined,
                status: 'draft',
                userId,
            },
        });
    }
    async update(id, userId, data) {
        const project = await this.prisma.project.findUnique({ where: { id } });
        if (!project)
            throw new common_1.NotFoundException('프로젝트를 찾을 수 없습니다');
        if (project.userId !== userId)
            throw new common_1.ForbiddenException();
        return this.prisma.project.update({
            where: { id },
            data,
        });
    }
    async remove(id, userId) {
        const project = await this.prisma.project.findUnique({ where: { id } });
        if (!project)
            throw new common_1.NotFoundException('프로젝트를 찾을 수 없습니다');
        if (project.userId !== userId)
            throw new common_1.ForbiddenException();
        await this.prisma.project.delete({ where: { id } });
        return { success: true };
    }
};
exports.ProjectService = ProjectService;
exports.ProjectService = ProjectService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProjectService);
//# sourceMappingURL=project.service.js.map