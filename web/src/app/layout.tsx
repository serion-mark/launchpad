import type { Metadata } from "next";
import { ClientErrorBoundary } from "./ClientErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "Foundry - AI MVP 빌더",
  description: "AI가 만드는 풀스택 MVP. 외주비 3천만원을 20만원으로.",
  openGraph: {
    title: "Foundry - AI MVP 빌더",
    description: "아이디어만 있으면 됩니다. AI가 풀스택 MVP를 만들어 드립니다. 외주 3,000만원 → 30만원.",
    url: "https://foundry.ai.kr",
    siteName: "Foundry",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Foundry - AI MVP 빌더",
    description: "아이디어만 있으면 됩니다. AI가 풀스택 MVP를 만들어 드립니다.",
  },
  metadataBase: new URL("https://foundry.ai.kr"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" translate="no">
      <head>
        <meta name="google" content="notranslate" />
        <meta httpEquiv="Content-Language" content="ko" />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased notranslate">
        <ClientErrorBoundary>{children}</ClientErrorBoundary>
      </body>
    </html>
  );
}
