// 노션 원본 → 화면 데이터로 바꾸기, 공개만 남기기, 같은 앨범 노래 묶기.
// 노션을 부르지 않는 순수한 함수만 둔다. (가짜 데이터로 시험: scripts/test-transform.mjs)

export const KINDS = ["책", "영화", "노래", "공연", "전시"] as const;
export type Kind = (typeof KINDS)[number];

// 올해 문장에 쓰는 세는 말
export const UNITS: Record<Kind, string> = { 책: "권", 영화: "편", 노래: "곡", 공연: "번", 전시: "번" };

// 브라우저로 보내는 기록 한 줄. 노션 주소·작성자·편집 시간·사진 주소는 넣지 않는다.
export type ShelfItem = {
  id: string; // 노션 페이지 ID (사진 경로에만 쓴다)
  title: string;
  kind: Kind;
  creator: string; // 만든 사람 (작가·감독·가수·출연진…)
  album: string; // 노래일 때만
  withWhom: string; // 함께한 사람
  rating: number | null; // 1~5
  review: string;
  date: string | null; // YYYY-MM-DD
  hasCover: boolean;
};

// 화면의 카드 한 장. 보통은 기록 하나, 같은 앨범 노래는 여러 곡이 한 장으로 묶인다.
export type Card = {
  key: string;
  kind: Kind;
  isAlbum: boolean;
  title: string; // 앨범이면 앨범 이름
  creator: string;
  date: string | null; // 묶음 안에서 가장 최근 날짜
  coverId: string | null; // 표지 사진이 있는 기록의 ID
  items: ShelfItem[]; // 최근 순
};

type Props = Record<string, unknown>;
type PageLike = { id: string; properties: Props };
type TextPiece = { plain_text?: string };

const MAX_TITLE = 120;
const MAX_SHORT = 80;
const MAX_REVIEW = 300;

function textOf(props: Props, name: string): string {
  const p = props[name] as { title?: TextPiece[]; rich_text?: TextPiece[] } | undefined;
  const pieces = p?.title ?? p?.rich_text ?? [];
  return pieces
    .map((t) => t.plain_text ?? "")
    .join("")
    .trim();
}

function cut(text: string, max: number): string {
  const chars = Array.from(text); // 이모지가 반으로 잘리지 않게
  return chars.length > max ? `${chars.slice(0, max).join("")}…` : text;
}

function kindOf(props: Props): Kind | null {
  const p = props["종류"] as { select?: { name?: string } | null } | undefined;
  const name = p?.select?.name?.trim();
  return (KINDS as readonly string[]).includes(name ?? "") ? (name as Kind) : null;
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
function dateOf(props: Props): string | null {
  const p = props["날짜"] as { date?: { start?: string } | null } | undefined;
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

// 최근 날짜 먼저, 날짜 없는 것은 맨 뒤 (같으면 제목 순)
function byRecent(a: { date: string | null; title: string }, b: { date: string | null; title: string }): number {
  if (a.date !== b.date) {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date < b.date ? 1 : -1;
  }
  return a.title.localeCompare(b.title, "ko");
}

// 공개 체크 + 종류가 맞는 줄만 화면 항목으로 바꾼다
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
      creator: cut(textOf(props, "만든 사람"), MAX_SHORT),
      album: kind === "노래" ? cut(textOf(props, "앨범"), MAX_SHORT) : "",
      withWhom: cut(textOf(props, "함께한 사람"), MAX_SHORT),
      rating: ratingOf(props),
      review: cut(textOf(props, "한 줄 감상"), MAX_REVIEW),
      date: dateOf(props),
      hasCover: hasCoverOf(props),
    });
  }
  return items.sort(byRecent);
}

// 같은 앨범 이름 + 같은 만든 사람인 노래를 한 카드로 묶는다. 나머지는 한 줄 = 한 카드.
// 들어온 순서(최근 순)를 지키고, 앨범 카드는 그 앨범의 가장 최근 곡 자리에 놓인다.
export function toCards(items: ShelfItem[]): Card[] {
  const cards: Card[] = [];
  const albums = new Map<string, Card>();
  for (const it of items) {
    if (it.kind === "노래" && it.album) {
      const key = `album:${it.album.toLowerCase()}\u0000${it.creator.toLowerCase()}`;
      const found = albums.get(key);
      if (found) {
        found.items.push(it);
        if (!found.coverId && it.hasCover) found.coverId = it.id;
        if (it.date && (!found.date || it.date > found.date)) found.date = it.date;
        continue;
      }
      const card: Card = {
        key,
        kind: "노래",
        isAlbum: true,
        title: it.album,
        creator: it.creator,
        date: it.date,
        coverId: it.hasCover ? it.id : null,
        items: [it],
      };
      albums.set(key, card);
      cards.push(card);
      continue;
    }
    cards.push({
      key: it.id,
      kind: it.kind,
      isAlbum: false,
      title: it.title,
      creator: it.creator,
      date: it.date,
      coverId: it.hasCover ? it.id : null,
      items: [it],
    });
  }
  for (const c of cards) c.items.sort(byRecent);
  return cards;
}

// 앨범 카드의 평균 별점 (소수 첫째 자리), 별점이 하나도 없으면 null
export function averageRating(items: ShelfItem[]): number | null {
  const rs = items.map((i) => i.rating).filter((r): r is number => r !== null);
  if (rs.length === 0) return null;
  return Math.round((rs.reduce((a, b) => a + b, 0) / rs.length) * 10) / 10;
}

// 그 해에 기록한 종류별 개수 (노래는 곡 수)
export function countYear(items: ShelfItem[], year: number): Record<Kind, number> {
  const prefix = `${year}-`;
  const count = { 책: 0, 영화: 0, 노래: 0, 공연: 0, 전시: 0 } as Record<Kind, number>;
  for (const it of items) {
    if (it.date?.startsWith(prefix)) count[it.kind]++;
  }
  return count;
}

// 한국 시간 기준 오늘의 연도
export function seoulYear(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "numeric" }).format(now));
}
