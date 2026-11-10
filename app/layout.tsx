import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// 한글·본문은 Pretendard 하나, 영문 제목 「Archive」와 숫자만 Fraunces.
// 글꼴 파일은 빌드할 때 프로젝트에 담겨 우리 서버가 직접 내려 준다 (방문자가 구글에 접속하지 않음).
const fraunces = Fraunces({
  weight: ["500"],
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Archive · 나의 문화생활 기록",
  description: "읽고 보고 듣고 다녀온 것들",
  openGraph: { title: "Archive · 나의 문화생활 기록", type: "website", locale: "ko_KR" },
  robots: { index: false, follow: false }, // 개인 사이트라 검색엔진에 올리지 않는다
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${fraunces.variable} ${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
