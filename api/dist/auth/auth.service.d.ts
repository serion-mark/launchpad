import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
export declare class AuthService {
    private prisma;
    private jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
    signup(email: string, password: string, name?: string): Promise<{
        token: string;
        userId: string;
        email: string;
    }>;
    login(email: string, password: string): Promise<{
        token: string;
        userId: string;
        email: string;
    }>;
    getProfile(userId: string): Promise<{
        id: string;
        email: string;
        name: string;
        avatar: string;
        provider: string;
        plan: string;
        planExpiresAt: Date;
        createdAt: Date;
    }>;
    socialLogin(provider: string, providerId: string, email: string, name?: string, avatar?: string): Promise<{
        token: string;
        userId: string;
        email: string;
    }>;
    private issueToken;
}
