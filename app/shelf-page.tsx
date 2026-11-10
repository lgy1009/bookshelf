// 첫 화면 모양. (가짜 데이터로도 그려 볼 수 있게 page.tsx와 따로 둔다)
import type { Shelf } from "@/lib/shelf";
import { KINDS } from "@/lib/transform";
import { Fragment } from "react";
import { Bookshelf } from "./bookshelf";

// 사이트 제목 — 바꾸고 싶으면 여기만 고친다
export const SITE_TITLE = "Archive";

const NOTICE = {
  "no-token": "노션 연결 토큰(NOTION_TOKEN)이 아직 설정되지 않았어요.",
  "no-database": "노션에서 「문화생활」 표를 찾지 못했어요. 연결을 「나의 책장」 페이지에 이어 주세요.",
  error: "노션을 잠시 불러오지 못했어요. 조금 뒤 다시 열어 주세요.",
} as const;

export function ShelfPage({ shelf }: { shelf: Shelf }) {
  // 올해 기록이 있는 종류만 한 줄에 적는다
  const parts = shelf.ok ? KINDS.filter((k) => shelf.count[k] > 0) : [];

  return (
    <main className="mx-auto w-full max-w-[1040px] px-5 pt-12 pb-20 sm:px-10 sm:pt-16">
      <header>
        <h1 className="font-title text-[52px] leading-none font-medium tracking-[-0.02em] sm:text-[64px]">
          {SITE_TITLE}
          <span className="text-olive">.</span>
        </h1>
        <p className="mt-3 text-[15px] text-ink-soft sm:text-base">읽고, 보고, 듣고, 다녀온 것들</p>
        {shelf.ok && (
          <p className="mt-6 text-[15px] leading-relaxed text-[#333] sm:mt-7 sm:text-base">
            {shelf.year}년
            {parts.length === 0
              ? " · 아직 올해 기록이 없어요"
              : parts.map((k) => (
                  <Fragment key={k}>
                    {" · "}
                    <span className="whitespace-nowrap">
                      {k} <b className="font-bold text-olive">{shelf.count[k]}</b>
                    </span>
                  </Fragment>
                ))}
          </p>
        )}
      </header>

      {shelf.ok ? (
        <Bookshelf items={shelf.items} />
      ) : (
        <p className="mt-10 rounded-lg bg-card px-6 py-10 text-center">{NOTICE[shelf.reason]}</p>
      )}

      <footer className="mt-20 border-t border-line pt-6 text-center text-[13px] text-ink-soft">
        노션에 적은 기록 중 공개로 체크한 것만 보여요
      </footer>
    </main>
  );
}
