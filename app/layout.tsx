import type { Metadata } from "next";
import { Cormorant_Garamond, Gowun_Batang } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// 제목은 세리프(영문 Cormorant Garamond, 한글 Gowun Batang), 본문은 Pretendard.
// 글꼴 파일은 빌드할 때 프로젝트에 담겨 우리 서버가 직접 내려 준다 (방문자가 구글에 접속하지 않음).
const cormorant = Cormorant_Garamond({
  weight: ["500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

const gowun = Gowun_Batang({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-gowun",
  display: "swap",
  preload: false, // 한글 글자는 필요한 부분만 내려받는다
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
    <html lang="ko" className={`${cormorant.variable} ${gowun.variable} ${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
