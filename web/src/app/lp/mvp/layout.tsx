import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Foundry - 외주 미팅 전 필수 무기 | AI MVP 빌더',
  description: 'Foundry로 MVP 만들고 외주사 미팅에 가세요. 견적이 절반으로 줄어듭니다. 아이디어만 말하면 AI가 사업 검증부터 MVP까지.',
  openGraph: {
    title: 'Foundry - 외주 미팅 전 필수 무기',
    description: 'Foundry로 MVP 만들고 외주사 미팅에 가세요. 견적이 절반으로 줄어듭니다.',
    url: 'https://foundry.ai.kr/lp/mvp',
    siteName: 'Foundry',
    locale: 'ko_KR',
    type: 'website',
  },
};

export default function LpMvpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
