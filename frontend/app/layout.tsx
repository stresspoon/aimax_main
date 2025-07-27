import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "../providers/SessionProvider";

export const metadata: Metadata = {
  title: "AIMAX - 나만의 AI 비지니스 파트너",
  description: "생성형 AI를 활용한 SEO 기반 글쓰기, SNS 콘텐츠 기획, 상세페이지 기획 자동화 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="font-pretendard antialiased" style={{ backgroundColor: '#f2f1ed', color: '#131313' }}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
