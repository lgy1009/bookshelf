// 화면(서버 컴포넌트)이 책장 데이터를 받는 유일한 입구.
// 노션을 읽어 공개 항목만 남기고, 5분 동안 결과를 재사용한다.
import "server-only";
import { cacheLife } from "next/cache";
import { findShelfDatabase, NotionMissingToken, queryPublic } from "./notion";
import { countYear, seoulYear, toShelfItems, type ShelfItem } from "./transform";

export type Shelf =
  | { ok: true; items: ShelfItem[]; year: number; count: { books: number; movies: number } }
  | { ok: false; reason: "no-token" | "no-database" | "error" };

async function loadShelf(): Promise<Shelf> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });

  const dbId = await findShelfDatabase();
  if (!dbId) return { ok: false, reason: "no-database" };
  const items = toShelfItems(await queryPublic(dbId));
  const year = seoulYear(new Date());
  return { ok: true, items, year, count: countYear(items, year) };
}

export async function getShelf(): Promise<Shelf> {
  // 토큰이 없으면 노션을 부르지 않는다 (빌드가 멈추지 않게, 캐시 함수 밖에서 확인)
  if (!process.env.NOTION_TOKEN) return { ok: false, reason: "no-token" };
  try {
    return await loadShelf();
  } catch (e) {
    if (e instanceof NotionMissingToken || /NOTION_TOKEN/.test(String(e))) return { ok: false, reason: "no-token" };
    return { ok: false, reason: "error" };
  }
}
