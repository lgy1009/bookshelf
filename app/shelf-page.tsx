// 첫 화면 모양. (가짜 데이터로도 그려 볼 수 있게 page.tsx와 따로 둔다)
import type { Shelf } from "@/lib/shelf";
import { KINDS, UNITS } from "@/lib/transform";
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
  // 올해 기록이 있는 종류만 문장에 넣는다
  const parts = shelf.ok ? KINDS.filter((k) => shelf.count[k] > 0) : [];

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pt-8 pb-20 sm:px-8 sm:pt-14">
      <header className="mb-10 text-center sm:mb-14">
        <h1 className="font-display text-[68px] leading-[0.9] font-medium tracking-tight sm:text-[124px]">
          {SITE_TITLE}
        </h1>
        <p className="mt-3 text-xs font-semibold tracking-[0.4em] text-ink sm:text-sm">
          읽고 · 보고 · 듣고 · 다녀온 것들
        </p>

        {shelf.ok && (
          <p className="mx-auto mt-8 max-w-[720px] font-serif text-[21px] leading-relaxed break-keep sm:mt-10 sm:text-[28px]">
            <span className="text-coral">{shelf.year}년,</span>{" "}
            {parts.length === 0
              ? "아직 올해 기록이 없어요."
              : parts.map((k, i) => (
                  <Fragment key={k}>
                    {i > 0 && <span className="text-ink-soft"> · </span>}
                    <span className="whitespace-nowrap">
                      {k}{" "}
                      <span className="highlight font-bold">
                        {shelf.count[k]}
                        {UNITS[k]}
                      </span>
                    </span>
                  </Fragment>
                ))}
          </p>
        )}
      </header>

      {shelf.ok ? (
        <Bookshelf items={shelf.items} />
      ) : (
        <p className="rounded-lg bg-stone px-6 py-10 text-center font-serif">{NOTICE[shelf.reason]}</p>
      )}

      <footer className="mt-16 border-t border-line pt-6 text-center font-serif text-sm text-ink-soft">
        노션에 적은 기록 중 공개로 체크한 것만 보여요
      </footer>
    </main>
  );
}
