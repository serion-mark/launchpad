import { ProjectService } from './project.service';
import { DeployService } from './deploy.service';
export declare class ProjectController {
    private projectService;
    private deployService;
    constructor(projectService: ProjectService, deployService: DeployService);
    list(req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        template: string;
        theme: string;
        status: string;
        subdomain: string;
        deployedUrl: string;
    }[]>;
    create(req: any, body: {
        name: string;
        description?: string;
        template: string;
        theme?: string;
        features?: any;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        template: string;
        theme: string;
        features: import("@prisma/client/runtime/library").JsonValue | null;
        status: string;
        subdomain: string | null;
        userId: string;
        chatHistory: import("@prisma/client/runtime/library").JsonValue | null;
        generatedCode: import("@prisma/client/runtime/library").JsonValue | null;
        deployedUrl: string | null;
    }>;
    getById(req: any, id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        template: string;
        theme: string;
        features: import("@prisma/client/runtime/library").JsonValue | null;
        status: string;
        subdomain: string | null;
        userId: string;
        chatHistory: import("@prisma/client/runtime/library").JsonValue | null;
        generatedCode: import("@prisma/client/runtime/library").JsonValue | null;
        deployedUrl: string | null;
    }>;
    update(req: any, id: string, body: {
        name?: string;
        description?: string;
        theme?: string;
        features?: any;
        status?: string;
        chatHistory?: any;
        generatedCode?: any;
        subdomain?: string;
        deployedUrl?: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        template: string;
        theme: string;
        features: import("@prisma/client/runtime/library").JsonValue | null;
        status: string;
        subdomain: string | null;
        userId: string;
        chatHistory: import("@prisma/client/runtime/library").JsonValue | null;
        generatedCode: import("@prisma/client/runtime/library").JsonValue | null;
        deployedUrl: string | null;
    }>;
    remove(req: any, id: string): Promise<{
        success: boolean;
    }>;
    deploy(req: any, id: string): Promise<{
        subdomain: string;
        deployedUrl: string;
        status: string;
    }>;
    download(req: any, id: string): Promise<{
        projectName: string;
        template: string;
        theme: string;
        files: {
            path: string;
            content: string;
        }[];
    }>;
}
