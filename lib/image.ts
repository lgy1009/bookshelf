// 표지 사진 도우미. (DESIGN §4 /api/image)
// 노션 사진 주소는 약 1시간 뒤 만료되므로, 화면에는 우리 경로(/api/image?id=…)만 적고
// 그 경로가 요청될 때 서버가 노션에서 "지금 유효한 주소"를 받아 이동시킨다.
import "server-only";
import { cacheLife } from "next/cache";
import { findShelfDatabase, notionGet, type NotionPage } from "./notion";
import { isPublic } from "./transform";

// 노션 페이지 ID 검사: 32자리 16진수(하이픈 있어도 됨)만 받아서 하이픈 넣은 모양으로 맞춘다
export function normalizeId(raw: string): string | null {
  const hex = raw.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

type NotionFile = { type?: string; file?: { url?: string }; external?: { url?: string } };

// 우리 표의 공개 줄이면 표지 첫 장 주소, 아니면 null. 결과는 30분 재사용 (노션 주소 유효 1시간보다 짧게).
export async function lookupCover(pageId: string): Promise<string | null> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 1800, expire: 2700 });

  const page = await notionGet<NotionPage>(`/pages/${pageId}`).catch((e: unknown) => {
    if (/HTTP (400|404)/.test(String(e))) return null; // 없는 페이지 (연결이 못 보는 페이지 포함)
    throw e; // 노션 일시 장애는 캐시에 남기지 않는다
  });
  if (!page) return null;

  const dbId = await findShelfDatabase();
  const parent = page.parent?.database_id?.replace(/-/g, "");
  if (!dbId || parent !== dbId.replace(/-/g, "")) return null; // 우리 표의 줄이 아님
  if (!isPublic(page.properties ?? {})) return null; // 비공개

  const files = (page.properties?.["표지 사진"] as { files?: NotionFile[] } | undefined)?.files;
  const file = files?.[0];
  const url = file?.type === "external" ? file.external?.url : file?.file?.url;
  return url && url.startsWith("https://") ? url : null;
}
