// 첫 화면: 서버에서 노션을 읽어 공개 항목만 책장에 넘긴다.
import { getShelf } from "@/lib/shelf";
import { Bookshelf } from "./bookshelf";

const NOTICE = {
  "no-token": "노션 연결 토큰(NOTION_TOKEN)이 아직 설정되지 않았어요.",
  "no-database": "노션에서 「책·영화」 표를 찾지 못했어요. 연결을 「나의 책장」 페이지에 이어 주세요.",
  error: "노션을 잠시 불러오지 못했어요. 조금 뒤 다시 열어 주세요.",
} as const;

export default async function Home() {
  const shelf = await getShelf();

  return (
    <main className="mx-auto w-full max-w-[1000px] px-3 pt-6 pb-16 sm:px-6 sm:pt-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-pixel text-xs tracking-[0.3em] text-ink-soft">MY LITTLE BOOKSHELF</p>
          <h1 className="font-pixel text-3xl font-bold sm:text-4xl">
            나의 책장 <span aria-hidden>📚</span>
          </h1>
        </div>
        {shelf.ok && (
          <p className="sticker bg-mint/40 px-4 py-2.5 font-pixel text-sm sm:text-base">
            <span className="mr-2 rounded-md bg-ink px-1.5 py-0.5 text-xs text-cream">{shelf.year}</span>
            올해 읽은 책 <b className="text-tomato">{shelf.count.books}</b>권 · 본 영화{" "}
            <b className="text-tomato">{shelf.count.movies}</b>편
          </p>
        )}
      </header>

      {shelf.ok ? (
        <Bookshelf items={shelf.items} />
      ) : (
        <p className="sticker bg-white p-6 text-center font-pixel">{NOTICE[shelf.reason]}</p>
      )}

      <footer className="mt-10 text-center font-pixel text-xs text-ink-soft">
        노션에 적은 기록 중 공개로 체크한 것만 꽂혀 있어요
      </footer>
    </main>
  );
}
