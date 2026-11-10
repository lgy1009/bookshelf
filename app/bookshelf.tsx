"use client";
// 책장 + 골라 보기 + 감상 창. 서버가 이미 공개 항목만 넘겨주므로, 여기서는 고르고 보여 주기만 한다.
import { useMemo, useRef, useState } from "react";
import type { Kind, ShelfItem } from "@/lib/transform";

type KindFilter = "전체" | Kind;
const KINDS: KindFilter[] = ["전체", "책", "영화"];
const RATINGS: { label: string; min: number }[] = [
  { label: "전체", min: 0 },
  { label: "★ 5", min: 5 },
  { label: "★ 4 이상", min: 4 },
  { label: "★ 3 이상", min: 3 },
];
// 표지 사진이 없을 때 쓰는 색 표지 (바탕 / 글자)
const PLAIN_COVERS = [
  "bg-ink text-lemon",
  "bg-lemon text-ink",
  "bg-coral text-white",
  "bg-stone text-ink",
  "bg-moss text-lemon",
];

function plainCover(id: string): string {
  let n = 0;
  for (const ch of id) n = (n * 31 + ch.charCodeAt(0)) % 997;
  return PLAIN_COVERS[n % PLAIN_COVERS.length];
}

function coverSrc(id: string): string {
  return `/api/image?${new URLSearchParams({ id })}`;
}

export function Bookshelf({ items }: { items: ShelfItem[] }) {
  const [kind, setKind] = useState<KindFilter>("전체");
  const [minRating, setMinRating] = useState(0);
  const [year, setYear] = useState<string>("전체");
  const [open, setOpen] = useState<ShelfItem | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const years = useMemo(() => {
    const set = new Set(items.map((it) => it.finished?.slice(0, 4)).filter((y): y is string => !!y));
    return [...set].sort().reverse();
  }, [items]);

  const shown = items.filter(
    (it) =>
      (kind === "전체" || it.kind === kind) &&
      (minRating === 0 || (it.rating ?? 0) >= minRating) &&
      (year === "전체" || it.finished?.startsWith(`${year}-`)),
  );

  function openItem(it: ShelfItem) {
    setOpen(it);
    dialogRef.current?.showModal();
  }

  return (
    <>
      <section aria-label="골라 보기" className="mb-8 border-y border-line py-3">
        <FilterRow label="종류">
          {KINDS.map((k) => (
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
        <h2 className="font-serif text-xl font-bold sm:text-2xl">나의 책장</h2>
        <p className="text-sm text-ink-soft" aria-live="polite">
          {shown.length}개
        </p>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-lg bg-stone-soft py-20 text-center font-serif text-ink-soft">
          고른 조건에 맞는 기록이 없어요
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-7 sm:grid-cols-4 sm:gap-x-5 md:grid-cols-5 lg:grid-cols-6">
          {shown.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                className="cover-btn block w-full text-left"
                onClick={() => openItem(it)}
                aria-label={`${it.kind} 「${it.title}」 감상 보기`}
              >
                <span className="cover">
                  <Cover item={it} />
                  <span
                    aria-hidden
                    className="absolute top-1.5 left-1.5 rounded-[3px] bg-ink/85 px-1.5 py-0.5 text-[11px] font-semibold text-white"
                  >
                    {it.kind}
                  </span>
                </span>
                <span className="mt-2 block truncate text-[14px] font-semibold sm:text-[15px]">{it.title}</span>
                <span className="mt-0.5 block text-[12px] text-ink-soft sm:text-[13px]">
                  {it.finished ? it.finished.slice(0, 4) : "날짜 없음"}
                  {it.rating && <span className="ml-1.5 font-semibold text-coral">★ {it.rating}.0</span>}
                </span>
              </button>
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
        className="m-auto w-[min(92vw,560px)] rounded-xl bg-paper p-0 text-ink backdrop:bg-ink/60"
      >
        {open && (
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:p-7">
            <div className="cover w-[140px] shrink-0 self-center sm:w-[170px] sm:self-start">
              <Cover key={open.id} item={open} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <p className="text-xs font-semibold tracking-[0.2em] text-ink-soft">
                {open.kind === "책" ? "BOOK" : "FILM"}
                {open.finished && ` · ${open.finished.replaceAll("-", ".")}`}
              </p>
              <h2 className="font-serif text-2xl leading-snug font-bold break-keep">{open.title}</h2>
              <p className="text-lg tracking-[0.15em] text-coral" aria-label={open.rating ? `별점 ${open.rating}점` : "별점 없음"}>
                {open.rating ? "★".repeat(open.rating) + "☆".repeat(5 - open.rating) : <span className="text-sm tracking-normal text-ink-soft">별점 없음</span>}
              </p>
              <blockquote className="mt-1 rounded-lg bg-stone px-4 py-3.5 font-serif leading-relaxed break-keep whitespace-pre-line">
                {open.review ? <span className="highlight">{open.review}</span> : <span className="text-ink-soft">남긴 감상이 없어요.</span>}
              </blockquote>
              <button
                type="button"
                className="close-btn mt-2 self-end font-display text-lg font-medium"
                onClick={() => dialogRef.current?.close()}
                autoFocus
              >
                ( Close )
              </button>
            </div>
          </div>
        )}
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

// 표지 사진이 있으면 사진, 없거나 못 불러오면 색 표지에 제목
function Cover({ item }: { item: ShelfItem }) {
  const [broken, setBroken] = useState(false);
  if (item.hasCover && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverSrc(item.id)}
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
    <span className={`absolute inset-0 flex flex-col justify-between p-3 ${plainCover(item.id)}`}>
      <span aria-hidden className="pt-5 font-display text-sm italic opacity-80">
        {item.kind === "책" ? "a book" : "a film"}
      </span>
      <span className="line-clamp-4 font-serif text-[14px] leading-snug font-bold break-keep sm:text-[16px]">
        {item.title}
      </span>
    </span>
  );
}
