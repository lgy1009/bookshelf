// GET /api/image?id=<노션 페이지 ID>  — 표지 사진 (DESIGN §4)
// 노션에서 지금 유효한 사진 주소를 받아 그리로 이동시킨다.
//   400 형식 오류 / 404 없음·비공개·우리 표 밖 / 502 노션 장애
import type { NextRequest } from "next/server";
import { lookupCover, normalizeId } from "@/lib/image";

export async function GET(request: NextRequest) {
  const id = normalizeId(request.nextUrl.searchParams.get("id") ?? "");
  if (!id) return new Response("잘못된 요청", { status: 400 });

  let url: string | null;
  try {
    url = await lookupCover(id);
  } catch {
    return new Response("사진을 잠시 불러올 수 없습니다", { status: 502 });
  }
  if (!url) return new Response("사진 없음", { status: 404 });

  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      // 브라우저가 20분 동안 이 이동을 기억한다 (노션 주소 유효 시간보다 짧게)
      "Cache-Control": "public, max-age=1200",
      "Referrer-Policy": "no-referrer",
    },
  });
}
