// 첫 화면 모양. (가짜 데이터로도 그려 볼 수 있게 page.tsx와 따로 둔다)
import type { Shelf } from "@/lib/shelf";
import { Bookshelf } from "./bookshelf";

const NOTICE = {
  "no-token": "노션 연결 토큰(NOTION_TOKEN)이 아직 설정되지 않았어요.",
  "no-database": "노션에서 「책·영화」 표를 찾지 못했어요. 연결을 「나의 책장」 페이지에 이어 주세요.",
  error: "노션을 잠시 불러오지 못했어요. 조금 뒤 다시 열어 주세요.",
} as const;

export function ShelfPage({ shelf }: { shelf: Shelf }) {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pt-8 pb-20 sm:px-8 sm:pt-14">
      <header className="mb-10 text-center sm:mb-14">
        <h1 className="font-display text-[64px] leading-[0.9] font-medium tracking-tight sm:text-[120px]">
          Bookshelf
        </h1>
        <p className="mt-3 text-xs font-semibold tracking-[0.45em] text-ink sm:text-sm">읽고 · 본 · 것들</p>

        {shelf.ok && (
          <p className="mx-auto mt-8 max-w-[640px] font-serif text-[22px] leading-relaxed break-keep sm:mt-10 sm:text-[30px]">
            <span className="text-coral">{shelf.year}년,</span> 책{" "}
            <span className="highlight font-bold">{shelf.count.books}권</span>을 읽고 영화{" "}
            <span className="highlight font-bold">{shelf.count.movies}편</span>을 봤어요.
          </p>
        )}
      </header>

      {shelf.ok ? (
        <Bookshelf items={shelf.items} />
      ) : (
        <p className="rounded-lg bg-stone px-6 py-10 text-center font-serif">{NOTICE[shelf.reason]}</p>
      )}

      <footer className="mt-16 border-t border-line pt-6 text-center font-serif text-sm text-ink-soft">
        노션에 적은 기록 중 공개로 체크한 것만 꽂혀 있어요
      </footer>
    </main>
  );
}
