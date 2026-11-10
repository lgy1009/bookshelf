// 노션 원본 → 화면 데이터로 바꾸기, 그리고 공개만 남기기.
// 노션을 부르지 않는 순수한 함수만 둔다. (가짜 데이터로 시험: scripts/test-transform.mjs)

export type Kind = "책" | "영화";

// 브라우저로 보내는 항목 한 개. 노션 주소·작성자·편집 시간·사진 주소는 넣지 않는다.
export type ShelfItem = {
  id: string; // 노션 페이지 ID (사진 경로에만 쓴다)
  title: string;
  kind: Kind;
  rating: number | null; // 1~5
  review: string;
  finished: string | null; // YYYY-MM-DD
  hasCover: boolean;
};

type Props = Record<string, unknown>;
type PageLike = { id: string; properties: Props };
type TextPiece = { plain_text?: string };

const MAX_TITLE = 120;
const MAX_REVIEW = 300;

function textOf(props: Props, name: string): string {
  const p = props[name] as { title?: TextPiece[]; rich_text?: TextPiece[] } | undefined;
  const pieces = p?.title ?? p?.rich_text ?? [];
  return pieces.map((t) => t.plain_text ?? "").join("").trim();
}

function cut(text: string, max: number): string {
  const chars = Array.from(text); // 이모지가 반으로 잘리지 않게
  return chars.length > max ? `${chars.slice(0, max).join("")}…` : text;
}

function kindOf(props: Props): Kind | null {
  const p = props["종류"] as { select?: { name?: string } | null } | undefined;
  const name = p?.select?.name?.trim();
  return name === "책" || name === "영화" ? name : null;
}

// 1~5 정수만. 3.5처럼 적으면 반올림, 범위 밖이면 없음.
export function ratingOf(props: Props): number | null {
  const p = props["별점"] as { number?: number | null } | undefined;
  const n = p?.number;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r >= 1 && r <= 5 ? r : null;
}

// 날짜·시간이 있어도 앞의 YYYY-MM-DD만 쓴다
function finishedOf(props: Props): string | null {
  const p = props["다 본 날"] as { date?: { start?: string } | null } | undefined;
  const start = p?.date?.start ?? "";
  return /^\d{4}-\d{2}-\d{2}/.test(start) ? start.slice(0, 10) : null;
}

function hasCoverOf(props: Props): boolean {
  const p = props["표지 사진"] as { files?: unknown[] } | undefined;
  return Array.isArray(p?.files) && p.files.length > 0;
}

export function isPublic(props: Props): boolean {
  const p = props["공개"] as { checkbox?: boolean } | undefined;
  return p?.checkbox === true; // 체크가 확실할 때만 공개
}

// 공개 체크 + 종류(책/영화)가 맞는 줄만 화면 항목으로 바꾼다
export function toShelfItems(pages: PageLike[]): ShelfItem[] {
  const items: ShelfItem[] = [];
  for (const page of pages) {
    const props = page.properties ?? {};
    if (!isPublic(props)) continue;
    const kind = kindOf(props);
    if (!kind) continue;
    items.push({
      id: page.id,
      title: cut(textOf(props, "제목"), MAX_TITLE) || "(제목 없음)",
      kind,
      rating: ratingOf(props),
      review: cut(textOf(props, "한 줄 감상"), MAX_REVIEW),
      finished: finishedOf(props),
      hasCover: hasCoverOf(props),
    });
  }
  // 최근에 다 본 것부터, 날짜 없는 것은 맨 뒤 (같으면 제목 순)
  return items.sort((a, b) => {
    if (a.finished !== b.finished) {
      if (!a.finished) return 1;
      if (!b.finished) return -1;
      return a.finished < b.finished ? 1 : -1;
    }
    return a.title.localeCompare(b.title, "ko");
  });
}

// 올해(주어진 연도) 다 본 책·영화 개수
export function countYear(items: ShelfItem[], year: number): { books: number; movies: number } {
  const prefix = `${year}-`;
  let books = 0;
  let movies = 0;
  for (const it of items) {
    if (!it.finished?.startsWith(prefix)) continue;
    if (it.kind === "책") books++;
    else movies++;
  }
  return { books, movies };
}

// 한국 시간 기준 오늘의 연도
export function seoulYear(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "numeric" }).format(now));
}
