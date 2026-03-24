/**
 * 테스트 계정 비밀번호를 8자리 이상으로 변경하는 스크립트
 * 실행: node scripts/fix-test-password.js
 *
 * 서버에서 실행 시: cd /root/launchpad/api && node ../scripts/fix-test-password.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();

  try {
    // test@serion.ai.kr 비밀번호를 12345678로 변경
    const testEmail = 'test@serion.ai.kr';
    const newPassword = '12345678';
    const hash = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    if (!user) {
      console.log(`[SKIP] ${testEmail} 계정이 존재하지 않습니다`);
    } else {
      await prisma.user.update({
        where: { email: testEmail },
        data: { password: hash },
      });
      console.log(`[OK] ${testEmail} 비밀번호 → ${newPassword} (${hash.slice(0, 20)}...)`);
    }

    // mark@serion.ai.kr 비밀번호 길이 확인
    const markEmail = 'mark@serion.ai.kr';
    const markUser = await prisma.user.findUnique({ where: { email: markEmail } });
    if (markUser) {
      if (markUser.password) {
        // 8자리 테스트 비밀번호로 검증
        const test8 = await bcrypt.compare('12345678', markUser.password);
        const test6 = await bcrypt.compare('123456', markUser.password);
        if (test6) {
          console.log(`[WARN] ${markEmail} 비밀번호가 6자리입니다. 변경을 권장합니다.`);
          // 자동으로 변경
          const markHash = await bcrypt.hash('12345678', 10);
          await prisma.user.update({
            where: { email: markEmail },
            data: { password: markHash },
          });
          console.log(`[OK] ${markEmail} 비밀번호 → 12345678`);
        } else if (test8) {
          console.log(`[OK] ${markEmail} 이미 8자리 이상 비밀번호 사용 중`);
        } else {
          console.log(`[OK] ${markEmail} 비밀번호 확인 완료 (기존 비밀번호 유지)`);
        }
      } else {
        console.log(`[INFO] ${markEmail} 소셜 로그인 계정 (비밀번호 없음)`);
      }
    } else {
      console.log(`[SKIP] ${markEmail} 계정이 존재하지 않습니다`);
    }

  } catch (err) {
    console.error('[ERROR]', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
