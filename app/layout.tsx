import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// 제목은 도트 글꼴 Galmuri(SIL OFL 무료), 본문은 Pretendard.
// 글꼴 파일은 빌드할 때 프로젝트에 담겨 우리 서버가 직접 내려 준다 (방문자가 다른 사이트에 접속하지 않음).
const galmuri = localFont({
  src: [
    { path: "./fonts/Galmuri11.woff2", weight: "400" },
    { path: "./fonts/Galmuri11-Bold.woff2", weight: "700" },
  ],
  variable: "--font-galmuri",
  display: "swap",
});

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: "나의 책장",
  description: "읽은 책과 본 영화를 꽂아 두는 작은 책장",
  openGraph: { title: "나의 책장", type: "website", locale: "ko_KR" },
  robots: { index: false, follow: false }, // 개인 사이트라 검색엔진에 올리지 않는다
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${galmuri.variable} ${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
