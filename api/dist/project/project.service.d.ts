import { PrismaService } from '../prisma.service';
export declare class ProjectService {
    private prisma;
    constructor(prisma: PrismaService);
    list(userId: string): Promise<{
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
    getById(id: string, userId: string): Promise<{
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
    create(userId: string, data: {
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
    update(id: string, userId: string, data: {
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
    remove(id: string, userId: string): Promise<{
        success: boolean;
    }>;
}
