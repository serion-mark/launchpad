import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async signup(email: string, password: string, name?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('이미 가입된 이메일입니다');

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, password: hashed, name, provider: 'email' },
    });

    return this.issueToken(user.id, user.email);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');

    return this.issueToken(user.id, user.email);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, avatar: true, provider: true, plan: true, planExpiresAt: true, createdAt: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  // 소셜 로그인 (나중에 확장)
  async socialLogin(provider: string, providerId: string, email: string, name?: string, avatar?: string) {
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: { email, name, avatar, provider, providerId },
      });
    }

    return this.issueToken(user.id, user.email);
  }

  private issueToken(userId: string, email: string) {
    const token = this.jwt.sign({ sub: userId, email });
    return { token, userId, email };
  }
}
