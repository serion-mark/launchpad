import { AuthService } from './auth.service';
export declare class AuthController {
    private auth;
    constructor(auth: AuthService);
    signup(body: {
        email: string;
        password: string;
        name?: string;
    }): Promise<{
        token: string;
        userId: string;
        email: string;
    }>;
    login(body: {
        email: string;
        password: string;
    }): Promise<{
        token: string;
        userId: string;
        email: string;
    }>;
    getProfile(req: any): Promise<{
        id: string;
        email: string;
        name: string;
        avatar: string;
        provider: string;
        plan: string;
        planExpiresAt: Date;
        createdAt: Date;
    }>;
}
