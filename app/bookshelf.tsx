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
      <section
        aria-label="골라 보기"
        className="mt-9 flex flex-col gap-1 border-y border-line py-2 sm:mt-10 sm:flex-row sm:items-center sm:justify-between"
      >
        <div role="group" aria-label="종류" className="-mx-1 flex gap-5 overflow-x-auto px-1">
          {KIND_FILTERS.map((k) => (
            <button key={k} type="button" className="tab" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {k}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm text-ink-soft">
          <label className="flex items-center gap-1">
            별점
            <select className="pick" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
              {RATINGS.map((r) => (
                <option key={r.min} value={r.min}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            연도
            <select className="pick" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="전체">모든 해</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <p className="mt-6 text-[13px] text-ink-soft" aria-live="polite">
        {cards.length}개
      </p>

      {cards.length === 0 ? (
        <p className="mt-3 rounded-lg bg-card py-20 text-center text-ink-soft">고른 조건에 맞는 기록이 없어요</p>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-4 sm:gap-x-5 md:grid-cols-5 lg:grid-cols-6">
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
        className="m-auto max-h-[88vh] w-[min(92vw,560px)] rounded-xl bg-paper p-0 text-ink backdrop:bg-black/40"
      >
        {open && <Detail key={open.key} card={open} onClose={() => dialogRef.current?.close()} />}
      </dialog>
    </>
  );
}

// 표지 자리: 2:3 칸. 노래는 정사각형 표지를 칸 아래쪽에 앉히고, 앨범이면 뒤로 LP가 나온다.
function CoverSlot({ card, big = false }: { card: Card; big?: boolean }) {
  const square = card.kind === "노래";
  return (
    <span className={`relative flex aspect-[2/3] items-end ${big ? "w-[150px] sm:w-[170px]" : "w-full"}`}>
      {card.isAlbum && <span aria-hidden className="vinyl" />}
      <span
        className={`relative z-[1] block overflow-hidden rounded-md ${square ? "aspect-square w-[86%] bg-card-2" : "aspect-[2/3] w-full bg-card"}`}
      >
        <Cover card={card} />
      </span>
    </span>
  );
}

// 목록의 카드 한 장
function CardButton({ card, onOpen }: { card: Card; onOpen: () => void }) {
  const rating = card.isAlbum ? averageRating(card.items) : card.items[0].rating;
  const kindLabel = card.isAlbum ? `앨범 · ${card.items.length}곡` : card.kind;
  return (
    <button
      type="button"
      className="card-btn block w-full text-left"
      onClick={onOpen}
      aria-label={`${card.isAlbum ? "앨범" : card.kind} 「${card.title}」 감상 보기`}
    >
      <CoverSlot card={card} />
      <span className="mt-3 block truncate text-[14px] font-bold sm:text-[15px]">{card.title}</span>
      <span className="mt-0.5 block truncate text-[12px] text-ink-soft sm:text-[13px]">
        {kindLabel}
        {card.creator && ` · ${card.creator}`}
      </span>
      <span className="mt-1 block text-[12px] text-ink-soft sm:text-[13px]">
        {card.date ? card.date.slice(0, 4) : "날짜 없음"}
        {rating !== null && <b className="font-bold text-olive"> · ★ {rating.toFixed(1)}</b>}
      </span>
    </button>
  );
}

// 감상 창 안쪽. 앨범이면 곡 목록, 아니면 기록 하나.
function Detail({ card, onClose }: { card: Card; onClose: () => void }) {
  const it = card.items[0];
  return (
    <div className="flex flex-col gap-6 p-6 sm:flex-row sm:p-7">
      <div className="shrink-0 self-center sm:self-start">
        <CoverSlot card={card} big />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-[13px] text-ink-soft">
          {card.isAlbum ? `앨범 · ${card.items.length}곡` : card.kind}
          {!card.isAlbum && it.date && ` · ${dotted(it.date)}`}
        </p>
        <h2 className="text-[22px] leading-snug font-bold break-keep">{card.title}</h2>
        {(card.creator || (!card.isAlbum && it.album)) && (
          <p className="text-sm text-ink-soft">
            {card.creator}
            {!card.isAlbum && it.album && ` · 『${it.album}』`}
          </p>
        )}

        {card.isAlbum ? (
          <ol className="mt-2 flex flex-col gap-2">
            {card.items.map((song) => (
              <li key={song.id} className="rounded-lg bg-card px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-bold">{song.title}</span>
                  {song.rating && <span className="text-sm tracking-[0.1em] text-olive">{stars(song.rating)}</span>}
                </div>
                {song.review && <p className="mt-1.5 leading-relaxed break-keep whitespace-pre-line">{song.review}</p>}
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
              className="text-lg tracking-[0.12em] text-olive"
              aria-label={it.rating ? `별점 ${it.rating}점` : "별점 없음"}
            >
              {it.rating ? stars(it.rating) : <span className="text-sm tracking-normal text-ink-soft">별점 없음</span>}
            </p>
            {it.withWhom && <p className="text-sm text-ink-soft">with {it.withWhom}</p>}
            <p className="mt-2 rounded-lg bg-card px-4 py-3.5 leading-relaxed break-keep whitespace-pre-line">
              {it.review || <span className="text-ink-soft">남긴 감상이 없어요.</span>}
            </p>
          </>
        )}

        <button
          type="button"
          className="close-btn mt-3 self-end text-sm font-semibold text-ink-soft hover:text-ink"
          onClick={onClose}
          autoFocus
        >
          닫기 ✕
        </button>
      </div>
    </div>
  );
}

// 표지 사진이 있으면 사진, 없거나 못 불러오면 회색 칸에 제목
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
    <span className="absolute inset-0 flex items-end p-2.5 sm:p-3">
      <span className="line-clamp-3 text-[12px] leading-snug font-bold break-keep text-[#222] sm:text-[14px]">
        {card.title}
      </span>
    </span>
  );
}
