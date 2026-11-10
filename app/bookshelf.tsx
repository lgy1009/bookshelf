"use client";
// 카드 목록 + 골라 보기 + 감상 창. 서버가 이미 공개 항목만 넘겨주므로, 여기서는 고르고 보여 주기만 한다.
import { useMemo, useRef, useState } from "react";
import { averageRating, KINDS, toCards, type Card, type Kind, type ShelfItem } from "@/lib/transform";

type KindFilter = "전체" | Kind;
const KIND_FILTERS: KindFilter[] = ["전체", ...KINDS];
const RATINGS: { label: string; min: number }[] = [
  { label: "전체", min: 0 },
  { label: "★ 5", min: 5 },
  { label: "★ 4 이상", min: 4 },
  { label: "★ 3 이상", min: 3 },
];
const EN: Record<Kind, string> = { 책: "a book", 영화: "a film", 노래: "a song", 공연: "a show", 전시: "an exhibition" };
const EN_UPPER: Record<Kind, string> = { 책: "BOOK", 영화: "FILM", 노래: "SONG", 공연: "SHOW", 전시: "EXHIBITION" };

// 표지 사진이 없을 때 쓰는 색 표지 (바탕 / 글자)
const PLAIN_COVERS = [
  "bg-ink text-lemon",
  "bg-lemon text-ink",
  "bg-coral text-white",
  "bg-stone text-ink",
  "bg-moss text-lemon",
];

function plainCover(key: string): string {
  let n = 0;
  for (const ch of key) n = (n * 31 + ch.charCodeAt(0)) % 997;
  return PLAIN_COVERS[n % PLAIN_COVERS.length];
}

function stars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function dotted(date: string): string {
  return date.replaceAll("-", ".");
}

export function Bookshelf({ items }: { items: ShelfItem[] }) {
  const [kind, setKind] = useState<KindFilter>("전체");
  const [minRating, setMinRating] = useState(0);
  const [year, setYear] = useState<string>("전체");
  const [open, setOpen] = useState<Card | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const years = useMemo(() => {
    const set = new Set(items.map((it) => it.date?.slice(0, 4)).filter((y): y is string => !!y));
    return [...set].sort().reverse();
  }, [items]);

  // 기록을 먼저 거른 뒤 앨범으로 묶는다 (앨범 카드에는 조건에 맞는 곡만 남는다)
  const cards = toCards(
    items.filter(
      (it) =>
        (kind === "전체" || it.kind === kind) &&
        (minRating === 0 || (it.rating ?? 0) >= minRating) &&
        (year === "전체" || it.date?.startsWith(`${year}-`)),
    ),
  );

  function openCard(card: Card) {
    setOpen(card);
    dialogRef.current?.showModal();
  }

  return (
    <>
      <section aria-label="골라 보기" className="mb-8 border-y border-line py-3">
        <FilterRow label="종류">
          {KIND_FILTERS.map((k) => (
            <button key={k} type="button" className="paren" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {k}
            </button>
          ))}
        </FilterRow>
        <FilterRow label="별점">
          {RATINGS.map((r) => (
            <button
              key={r.label}
              type="button"
              className="paren"
              aria-pressed={minRating === r.min}
              onClick={() => setMinRating(r.min)}
            >
              {r.label}
            </button>
          ))}
        </FilterRow>
        <FilterRow label="연도">
          {["전체", ...years].map((y) => (
            <button key={y} type="button" className="paren" aria-pressed={year === y} onClick={() => setYear(y)}>
              {y}
            </button>
          ))}
        </FilterRow>
      </section>

      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-serif text-xl font-bold sm:text-2xl">기록</h2>
        <p className="text-sm text-ink-soft" aria-live="polite">
          {cards.length}개
        </p>
      </div>

      {cards.length === 0 ? (
        <p className="rounded-lg bg-stone-soft py-20 text-center font-serif text-ink-soft">
          고른 조건에 맞는 기록이 없어요
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-7 sm:grid-cols-4 sm:gap-x-5 md:grid-cols-5 lg:grid-cols-6">
          {cards.map((card) => (
            <li key={card.key}>
              <CardButton card={card} onOpen={() => openCard(card)} />
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close(); // 바깥(어두운 곳)을 누르면 닫기
        }}
        aria-label={open ? `「${open.title}」 감상` : "감상"}
        className="m-auto max-h-[88vh] w-[min(92vw,580px)] rounded-xl bg-paper p-0 text-ink backdrop:bg-ink/60"
      >
        {open && <Detail key={open.key} card={open} onClose={() => dialogRef.current?.close()} />}
      </dialog>
    </>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-x-1 gap-y-0.5 py-0.5">
      <span className="w-12 shrink-0 text-xs font-semibold tracking-[0.2em] text-ink-soft">{label}</span>
      {children}
    </div>
  );
}

// 목록의 카드 한 장: 표지 + 제목 + 만든 사람 + 연도·별점
function CardButton({ card, onOpen }: { card: Card; onOpen: () => void }) {
  const rating = card.isAlbum ? averageRating(card.items) : card.items[0].rating;
  return (
    <button
      type="button"
      className="cover-btn block w-full text-left"
      onClick={onOpen}
      aria-label={`${card.isAlbum ? "앨범" : card.kind} 「${card.title}」 감상 보기`}
    >
      {/* 노래(정사각형 표지)도 2:3 칸의 아래쪽에 앉혀서, 한 줄의 제목 높이가 맞게 한다 */}
      <span className="flex aspect-[2/3] w-full items-end">
        <span className={`cover ${card.kind === "노래" ? "aspect-square" : ""}`}>
          <Cover card={card} />
          <span
            aria-hidden
            className="absolute top-1.5 left-1.5 rounded-[3px] bg-ink/85 px-1.5 py-0.5 text-[11px] font-semibold text-white"
          >
            {card.isAlbum ? `앨범 · ${card.items.length}곡` : card.kind}
          </span>
        </span>
      </span>
      <span className="mt-2 block truncate text-[14px] font-semibold sm:text-[15px]">{card.title}</span>
      {card.creator && <span className="block truncate text-[12px] text-ink-soft sm:text-[13px]">{card.creator}</span>}
      <span className="mt-0.5 block text-[12px] text-ink-soft sm:text-[13px]">
        {card.date ? card.date.slice(0, 4) : "날짜 없음"}
        {rating !== null && (
          <span className="ml-1.5 font-semibold text-coral">★ {rating.toFixed(1)}</span>
        )}
      </span>
    </button>
  );
}

// 감상 창 안쪽. 앨범이면 곡 목록, 아니면 기록 하나.
function Detail({ card, onClose }: { card: Card; onClose: () => void }) {
  const it = card.items[0];
  return (
    <div className="flex flex-col gap-5 p-6 sm:flex-row sm:p-7">
      <div
        className={`cover shrink-0 self-center sm:self-start ${card.kind === "노래" ? "aspect-square w-[160px] sm:w-[180px]" : "w-[140px] sm:w-[170px]"}`}
      >
        <Cover card={card} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <p className="text-xs font-semibold tracking-[0.2em] text-ink-soft">
          {card.isAlbum ? "ALBUM" : EN_UPPER[card.kind]}
          {!card.isAlbum && it.date && ` · ${dotted(it.date)}`}
        </p>
        <h2 className="font-serif text-2xl leading-snug font-bold break-keep">{card.title}</h2>
        {(card.creator || (!card.isAlbum && it.album)) && (
          <p className="text-sm text-ink-soft">
            {card.creator}
            {!card.isAlbum && it.album && ` · 『${it.album}』`}
          </p>
        )}

        {card.isAlbum ? (
          <ol className="mt-1 flex flex-col gap-2.5">
            {card.items.map((song) => (
              <li key={song.id} className="rounded-lg bg-stone px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-semibold">{song.title}</span>
                  {song.rating && <span className="text-sm tracking-[0.1em] text-coral">{stars(song.rating)}</span>}
                </div>
                {song.review && (
                  <p className="mt-1.5 font-serif leading-relaxed break-keep whitespace-pre-line">
                    <span className="highlight">{song.review}</span>
                  </p>
                )}
                <p className="mt-1 text-xs text-ink-soft">
                  {song.date ? dotted(song.date) : "날짜 없음"}
                  {song.withWhom && ` · with ${song.withWhom}`}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <>
            <p
              className="text-lg tracking-[0.15em] text-coral"
              aria-label={it.rating ? `별점 ${it.rating}점` : "별점 없음"}
            >
              {it.rating ? stars(it.rating) : <span className="text-sm tracking-normal text-ink-soft">별점 없음</span>}
            </p>
            {it.withWhom && (
              <p className="text-sm">
                <span className="font-display text-base italic">with</span> {it.withWhom}
              </p>
            )}
            <blockquote className="mt-1 rounded-lg bg-stone px-4 py-3.5 font-serif leading-relaxed break-keep whitespace-pre-line">
              {it.review ? (
                <span className="highlight">{it.review}</span>
              ) : (
                <span className="text-ink-soft">남긴 감상이 없어요.</span>
              )}
            </blockquote>
          </>
        )}

        <button
          type="button"
          className="close-btn mt-2 self-end font-display text-lg font-medium"
          onClick={onClose}
          autoFocus
        >
          ( Close )
        </button>
      </div>
    </div>
  );
}

// 표지 사진이 있으면 사진, 없거나 못 불러오면 색 표지에 제목
function Cover({ card }: { card: Card }) {
  const [broken, setBroken] = useState(false);
  if (card.coverId && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/image?${new URLSearchParams({ id: card.coverId })}`}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  return (
    <span className={`absolute inset-0 flex flex-col justify-between p-3 ${plainCover(card.key)}`}>
      <span aria-hidden className="pt-5 font-display text-sm italic opacity-80">
        {card.isAlbum ? "an album" : EN[card.kind]}
      </span>
      <span className="line-clamp-4 font-serif text-[14px] leading-snug font-bold break-keep sm:text-[16px]">
        {card.title}
      </span>
    </span>
  );
}
