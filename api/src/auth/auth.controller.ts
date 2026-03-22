import { Controller, Post, Get, Body, Query, Res, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private config: ConfigService,
  ) {}

  @Post('signup')
  signup(@Body() body: { email: string; password: string; name?: string }) {
    return this.auth.signup(body.email, body.password, body.name);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req: any) {
    return this.auth.getProfile(req.user.userId);
  }

  @Post('agree')
  @UseGuards(AuthGuard('jwt'))
  agreeTerms(@Req() req: any, @Body() body: { terms: boolean; privacy: boolean; refund: boolean; marketing?: boolean }) {
    return this.auth.agreeTerms(req.user.userId, body);
  }

  /** 카카오 로그인 시작 — 프론트에서 이 URL로 리다이렉트 */
  @Get('kakao')
  kakaoLogin(@Res() res: Response) {
    const clientId = this.config.get('KAKAO_CLIENT_ID');
    const redirectUri = this.config.get('KAKAO_REDIRECT_URI');
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    res.redirect(kakaoAuthUrl);
  }

  /** 카카오 콜백 — code → access_token → 사용자정보 → JWT 발급 → 프론트 리다이렉트 */
  @Get('kakao/callback')
  async kakaoCallback(@Query('code') code: string, @Query('error') error: string, @Res() res: Response) {
    const frontendUrl = this.config.get('FRONTEND_URL') || 'https://foundry.ai.kr';

    if (error || !code) {
      return res.redirect(`${frontendUrl}/login?error=kakao_denied`);
    }

    try {
      const result = await this.auth.kakaoLogin(code);
      // JWT를 쿼리 파라미터로 프론트에 전달
      return res.redirect(
        `${frontendUrl}/auth/kakao/callback?token=${result.token}&userId=${result.userId}&email=${encodeURIComponent(result.email)}`,
      );
    } catch (err) {
      console.error('카카오 로그인 실패:', err);
      return res.redirect(`${frontendUrl}/login?error=kakao_failed`);
    }
  }

  /** GitHub 로그인 시작 */
  @Get('github')
  githubLogin(@Res() res: Response) {
    const clientId = this.config.get('GITHUB_CLIENT_ID');
    const redirectUri = this.config.get('GITHUB_REDIRECT_URI') || 'https://foundry.ai.kr/api/auth/github/callback';
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user:email`;
    res.redirect(githubAuthUrl);
  }

  /** GitHub 콜백 */
  @Get('github/callback')
  async githubCallback(@Query('code') code: string, @Query('error') error: string, @Res() res: Response) {
    const frontendUrl = this.config.get('FRONTEND_URL') || 'https://foundry.ai.kr';

    if (error || !code) {
      return res.redirect(`${frontendUrl}/login?error=github_denied`);
    }

    try {
      const result = await this.auth.githubLogin(code);
      return res.redirect(
        `${frontendUrl}/auth/github/callback?token=${result.token}&userId=${result.userId}&email=${encodeURIComponent(result.email)}`,
      );
    } catch (err) {
      console.error('GitHub 로그인 실패:', err);
      return res.redirect(`${frontendUrl}/login?error=github_failed`);
    }
  }
}
