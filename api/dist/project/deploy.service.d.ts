import { PrismaService } from '../prisma.service';
export declare class DeployService {
    private prisma;
    constructor(prisma: PrismaService);
    private generateSubdomain;
    saveProjectFiles(projectId: string, userId: string): Promise<{
        outputDir: string;
        fileCount: number;
    }>;
    deploy(projectId: string, userId: string): Promise<{
        subdomain: string;
        deployedUrl: string;
        status: string;
    }>;
    generateZip(projectId: string, userId: string): Promise<{
        zipPath: string;
        fileName: string;
    }>;
    getDownloadManifest(projectId: string, userId: string): Promise<{
        projectName: string;
        template: string;
        theme: string;
        files: {
            path: string;
            content: string;
        }[];
    }>;
    private getDemoFiles;
}
