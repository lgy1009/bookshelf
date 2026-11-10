// 노션 REST API를 fetch로 직접 부른다. (새 라이브러리 없음)
// 토큰은 환경 변수(NOTION_TOKEN)에서만 읽고, 로그나 화면에 내보내지 않는다.
// 서버 코드에서만 쓴다.
import "server-only";

const API = "https://api.notion.com/v1";
const VERSION = "2022-06-28";

// 노션에서 이 이름과 똑같은 표를 찾는다. (DESIGN §3)
export const DB_TITLE = "책·영화";

// 노션 페이지(= 표의 한 줄). 열 값은 노션 원본 모양 그대로 둔다.
export type NotionPage = {
  id: string;
  parent?: { type?: string; database_id?: string };
  properties: Record<string, unknown>;
};

export class NotionMissingToken extends Error {}

function token(): string {
  const value = process.env.NOTION_TOKEN;
  if (!value) throw new NotionMissingToken("NOTION_TOKEN이 설정되어 있지 않습니다.");
  return value;
}

async function notion<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Notion-Version": VERSION,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store", // 재사용(캐시)은 shelf.ts·image.ts에서 정한다
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    // 오류 내용에 기록이 섞일 수 있어 상태 코드만 남긴다
    throw new Error(`노션 요청 실패 (HTTP ${res.status})`);
  }
  return (await res.json()) as T;
}

export function notionGet<T>(path: string): Promise<T> {
  return notion<T>(path);
}

// 연결이 볼 수 있는 표 중 이름이 「책·영화」인 것의 ID (없으면 null)
export async function findShelfDatabase(): Promise<string | null> {
  const data = await notion<{ results: { id: string; title?: { plain_text: string }[] }[] }>("/search", {
    query: DB_TITLE,
    filter: { property: "object", value: "database" },
    page_size: 100,
  });
  for (const db of data.results) {
    const title = (db.title ?? []).map((t) => t.plain_text).join("").trim();
    if (title === DB_TITLE) return db.id;
  }
  return null;
}

// 표의 공개 체크된 줄을 모두 가져온다 (한 번에 100개씩 이어서).
// 노션에서 한 번 거르고, transform.ts에서 한 번 더 거른다.
export async function queryPublic(databaseId: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const data = await notion<{ results: NotionPage[]; has_more: boolean; next_cursor: string | null }>(
      `/databases/${databaseId}/query`,
      {
        page_size: 100,
        filter: { property: "공개", checkbox: { equals: true } },
        ...(cursor ? { start_cursor: cursor } : {}),
      },
    );
    pages.push(...data.results);
    cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
  } while (cursor && pages.length < 2000);
  return pages;
}
