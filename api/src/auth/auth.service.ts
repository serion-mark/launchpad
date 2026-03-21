import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
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
      select: {
        id: true, email: true, name: true, avatar: true, provider: true,
        plan: true, planExpiresAt: true, createdAt: true,
        termsAgreedAt: true, privacyAgreedAt: true, refundAgreedAt: true, marketingAgreedAt: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  /** 약관 동의 처리 */
  async agreeTerms(userId: string, body: { terms: boolean; privacy: boolean; refund: boolean; marketing?: boolean }) {
    const now = new Date();
    const data: any = {};
    if (body.terms) data.termsAgreedAt = now;
    if (body.privacy) data.privacyAgreedAt = now;
    if (body.refund) data.refundAgreedAt = now;
    if (body.marketing) data.marketingAgreedAt = now;

    const user = await this.prisma.user.update({ where: { id: userId }, data });
    return { success: true, termsAgreedAt: user.termsAgreedAt };
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

  /** 카카오 인가코드로 로그인/회원가입 처리 */
  async kakaoLogin(code: string) {
    const clientId = this.config.get('KAKAO_CLIENT_ID');
    const redirectUri = this.config.get('KAKAO_REDIRECT_URI');

    // 1) 인가코드 → 액세스 토큰
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new UnauthorizedException('카카오 토큰 발급 실패');
    }

    // 2) 액세스 토큰 → 사용자 정보
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    const kakaoId = String(userData.id);
    const nickname = userData.kakao_account?.profile?.nickname || userData.properties?.nickname || '사용자';
    const avatar = userData.kakao_account?.profile?.profile_image_url || userData.properties?.profile_image || null;
    // 이메일은 비즈앱 전환 후 가능, 현재는 카카오ID 기반 가상 이메일
    const email = userData.kakao_account?.email || `kakao_${kakaoId}@foundry.ai.kr`;

    // 3) 기존 카카오 유저 찾기 (providerId 기준)
    let user = await this.prisma.user.findFirst({
      where: { provider: 'kakao', providerId: kakaoId },
    });

    if (!user) {
      // 같은 이메일로 가입된 이메일 유저가 있으면 카카오 연동
      const emailUser = await this.prisma.user.findUnique({ where: { email } });
      if (emailUser) {
        user = await this.prisma.user.update({
          where: { id: emailUser.id },
          data: { provider: 'kakao', providerId: kakaoId, avatar: avatar || emailUser.avatar },
        });
      } else {
        // 신규 가입
        user = await this.prisma.user.create({
          data: { email, name: nickname, avatar, provider: 'kakao', providerId: kakaoId },
        });
      }
    }

    return this.issueToken(user.id, user.email);
  }

  private issueToken(userId: string, email: string) {
    const token = this.jwt.sign({ sub: userId, email });
    return { token, userId, email };
  }
}
