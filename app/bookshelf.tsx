"use client";
// 책장 + 골라 보기 + 감상 창. 서버가 이미 공개 항목만 넘겨주므로, 여기서는 고르고 보여 주기만 한다.
import { useMemo, useRef, useState } from "react";
import type { Kind, ShelfItem } from "@/lib/transform";

type KindFilter = "전체" | Kind;
const KINDS: KindFilter[] = ["전체", "책", "영화"];
const RATINGS: { label: string; min: number }[] = [
  { label: "전체", min: 0 },
  { label: "★5", min: 5 },
  { label: "★4 이상", min: 4 },
  { label: "★3 이상", min: 3 },
];
const SPINES = ["bg-tomato", "bg-mustard", "bg-mint", "bg-sky", "bg-plum"];

function spineColor(id: string): string {
  let n = 0;
  for (const ch of id) n = (n * 31 + ch.charCodeAt(0)) % 997;
  return SPINES[n % SPINES.length];
}

function stars(rating: number | null): string {
  return rating ? "★".repeat(rating) + "☆".repeat(5 - rating) : "별점 없음";
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
      <section aria-label="골라 보기" className="sticker mb-5 flex flex-col gap-3 bg-white/80 p-3.5 sm:p-4">
        <FilterRow label="종류">
          {KINDS.map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {k === "책" ? "📖 책" : k === "영화" ? "🎬 영화" : "전체"}
            </button>
          ))}
        </FilterRow>
        <FilterRow label="별점">
          {RATINGS.map((r) => (
            <button
              key={r.label}
              type="button"
              className="chip"
              aria-pressed={minRating === r.min}
              onClick={() => setMinRating(r.min)}
            >
              {r.label}
            </button>
          ))}
        </FilterRow>
        <FilterRow label="연도">
          {["전체", ...years].map((y) => (
            <button key={y} type="button" className="chip" aria-pressed={year === y} onClick={() => setYear(y)}>
              {y}
            </button>
          ))}
        </FilterRow>
      </section>

      <div className="rounded-2xl border-[3px] border-ink bg-wall p-3 shadow-[5px_5px_0_var(--color-ink)] sm:p-5">
        <p className="mb-2 font-pixel text-xs text-ink-soft" aria-live="polite">
          {shown.length}개 꽂혀 있어요
        </p>
        {shown.length === 0 ? (
          <p className="py-16 text-center font-pixel text-ink-soft">고른 조건에 맞는 기록이 없어요 🫧</p>
        ) : (
          <ul className="shelf">
            {shown.map((it) => (
              <li key={it.id} className="shelf-cell">
                <button
                  type="button"
                  className={`book ${spineColor(it.id)} overflow-hidden`}
                  onClick={() => openItem(it)}
                  aria-label={`${it.kind} 「${it.title}」 감상 보기`}
                >
                  <Cover item={it} />
                  <span
                    aria-hidden
                    className="absolute top-1 right-1 rounded-full border-2 border-ink bg-cream px-1 text-[11px] leading-4"
                  >
                    {it.kind === "책" ? "📖" : "🎬"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close(); // 바깥(어두운 곳)을 누르면 닫기
        }}
        aria-label={open ? `「${open.title}」 감상` : "감상"}
        className="m-auto w-[min(92vw,460px)] rounded-2xl border-[3px] border-ink bg-cream p-0 text-ink shadow-[6px_6px_0_var(--color-ink)] backdrop:bg-ink/50"
      >
        {open && (
          <div className="flex flex-col gap-4 p-5 sm:flex-row">
            <div className={`book ${spineColor(open.id)} shrink-0 self-center overflow-hidden hover:transform-none`}>
              <Cover key={open.id} item={open} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="font-pixel text-xs text-ink-soft">
                {open.kind === "책" ? "📖 책" : "🎬 영화"}
                {open.finished && ` · ${open.finished.replaceAll("-", ".")} 다 봄`}
              </p>
              <h2 className="font-pixel text-xl leading-snug font-bold break-keep">{open.title}</h2>
              <p className="text-lg tracking-wider text-mustard [text-shadow:1px_1px_0_var(--color-ink)]">
                {stars(open.rating)}
              </p>
              <p className="sticker bg-white p-3 leading-relaxed break-keep whitespace-pre-line">
                {open.review || "남긴 감상이 없어요."}
              </p>
              <button
                type="button"
                className="chip mt-1 self-end"
                onClick={() => dialogRef.current?.close()}
                autoFocus
              >
                닫기 ✕
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
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="w-10 shrink-0 font-pixel text-sm font-bold">{label}</span>
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
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-2 pl-3">
      <span aria-hidden className="h-1 w-3/4 rounded-full bg-ink/25" />
      <span className="line-clamp-4 text-center font-pixel text-[12px] leading-tight font-bold break-keep text-ink sm:text-[13px]">
        {item.title}
      </span>
      <span aria-hidden className="h-1 w-3/4 rounded-full bg-ink/25" />
    </span>
  );
}
