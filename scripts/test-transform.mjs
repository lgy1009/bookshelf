// 가짜 노션 데이터로 transform.ts 규칙을 시험한다. 실행: npm.cmd run test:transform
import assert from "node:assert/strict";
import { countYear, ratingOf, seoulYear, toShelfItems } from "../lib/transform.ts";

const t = (s) => [{ plain_text: s }];
function page(id, { title = "제목", kind = "책", rating = 4, review = "", date = "2026-05-01", files = 0, pub = true } = {}) {
  return {
    id,
    properties: {
      제목: { title: title === null ? [] : t(title) },
      종류: { select: kind === null ? null : { name: kind } },
      별점: { number: rating },
      "한 줄 감상": { rich_text: review ? t(review) : [] },
      "다 본 날": { date: date ? { start: date } : null },
      "표지 사진": { files: Array.from({ length: files }, () => ({ type: "file", file: { url: "https://x" } })) },
      공개: { checkbox: pub },
    },
  };
}

let n = 0;
const check = (name, fn) => {
  fn();
  n++;
  console.log(`ok ${n} ${name}`);
};

// 공개 필터
const pages = [
  page("a", { title: "공개 책" }),
  page("b", { title: "비공개", pub: false }),
  page("c", { title: "공개 없음" }),
  { id: "d", properties: { 제목: { title: t("공개 열 없음") }, 종류: { select: { name: "책" } } } },
  { id: "e", properties: { ...page("e").properties, 공개: { checkbox: "true" } } },
  { id: "f", properties: {} },
];
pages[2].properties.공개 = { checkbox: null };
const items = toShelfItems(pages);
check("공개 체크만 남는다", () => assert.deepEqual(items.map((i) => i.id), ["a"]));
check("비공개는 빠진다", () => assert.ok(!items.some((i) => i.id === "b")));
check("체크 null은 비공개", () => assert.ok(!items.some((i) => i.id === "c")));
check("공개 열이 없으면 비공개", () => assert.ok(!items.some((i) => i.id === "d")));
check("문자 'true'는 비공개", () => assert.ok(!items.some((i) => i.id === "e")));
check("빈 줄은 빠진다", () => assert.ok(!items.some((i) => i.id === "f")));

// 종류
const one = (opts) => toShelfItems([page("x", opts)])[0];
check("책", () => assert.equal(one({ kind: "책" }).kind, "책"));
check("영화", () => assert.equal(one({ kind: "영화" }).kind, "영화"));
check("종류 앞뒤 공백", () => assert.equal(one({ kind: " 영화 " }).kind, "영화"));
check("종류 없음은 빠진다", () => assert.equal(one({ kind: null }), undefined));
check("다른 종류(드라마)는 빠진다", () => assert.equal(one({ kind: "드라마" }), undefined));

// 별점
const r = (v) => ratingOf({ 별점: { number: v } });
check("별점 5", () => assert.equal(r(5), 5));
check("별점 1", () => assert.equal(r(1), 1));
check("별점 3.5 → 4", () => assert.equal(r(3.5), 4));
check("별점 0 → 없음", () => assert.equal(r(0), null));
check("별점 6 → 없음", () => assert.equal(r(6), null));
check("별점 -1 → 없음", () => assert.equal(r(-1), null));
check("별점 null → 없음", () => assert.equal(r(null), null));
check("별점 열 없음", () => assert.equal(ratingOf({}), null));
check("별점 NaN → 없음", () => assert.equal(r(NaN), null));

// 제목·감상
check("제목 없으면 (제목 없음)", () => assert.equal(one({ title: null }).title, "(제목 없음)"));
check("제목 공백 정리", () => assert.equal(one({ title: "  어린 왕자  " }).title, "어린 왕자"));
check("긴 제목은 자른다", () => assert.ok(one({ title: "가".repeat(200) }).title.length <= 121));
check("긴 감상은 300자", () => assert.equal(Array.from(one({ review: "나".repeat(500) }).review).length, 301));
check("이모지가 반으로 안 잘린다", () => assert.ok(!one({ review: "😀".repeat(400) }).review.includes("�")));
check("감상 없음은 빈 문자열", () => assert.equal(one({ review: "" }).review, ""));

// 날짜·표지
check("날짜 YYYY-MM-DD", () => assert.equal(one({ date: "2026-03-04" }).finished, "2026-03-04"));
check("날짜+시간은 날짜만", () => assert.equal(one({ date: "2026-03-04T10:00:00.000+09:00" }).finished, "2026-03-04"));
check("날짜 없음", () => assert.equal(one({ date: null }).finished, null));
check("이상한 날짜", () => assert.equal(one({ date: "어제" }).finished, null));
check("표지 있음", () => assert.equal(one({ files: 2 }).hasCover, true));
check("표지 없음", () => assert.equal(one({ files: 0 }).hasCover, false));
check("사진 주소는 넘기지 않는다", () => assert.ok(!JSON.stringify(one({ files: 1 })).includes("https://")));

// 정렬
const sorted = toShelfItems([
  page("1", { title: "나", date: "2025-01-01" }),
  page("2", { title: "가", date: null }),
  page("3", { title: "다", date: "2026-02-01" }),
  page("4", { title: "가", date: "2026-02-01" }),
]);
check("최근 순, 같은 날은 제목 순, 날짜 없음은 끝", () => assert.deepEqual(sorted.map((i) => i.id), ["4", "3", "1", "2"]));

// 올해 숫자
const mix = toShelfItems([
  page("b1", { kind: "책", date: "2026-01-01" }),
  page("b2", { kind: "책", date: "2026-12-31" }),
  page("b3", { kind: "책", date: "2025-12-31" }),
  page("m1", { kind: "영화", date: "2026-06-01" }),
  page("m2", { kind: "영화", date: null }),
  page("m3", { kind: "영화", date: "2026-07-01", pub: false }),
]);
check("올해 숫자 (비공개·작년·날짜 없음 제외)", () => assert.deepEqual(countYear(mix, 2026), { books: 2, movies: 1 }));
check("다른 해", () => assert.deepEqual(countYear(mix, 2025), { books: 1, movies: 0 }));
check("한국 시간 연말 경계", () => assert.equal(seoulYear(new Date("2026-12-31T15:30:00Z")), 2027));
check("한국 시간 연초", () => assert.equal(seoulYear(new Date("2026-12-31T14:30:00Z")), 2026));

console.log(`\n모두 통과: ${n}개`);
