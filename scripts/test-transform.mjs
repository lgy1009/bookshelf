// 가짜 노션 데이터로 transform.ts 규칙을 시험한다. 실행: npm.cmd run test:transform
import assert from "node:assert/strict";
import { averageRating, countYear, ratingOf, seoulYear, toCards, toShelfItems } from "../lib/transform.ts";

const t = (s) => [{ plain_text: s }];
function page(id, { title = "제목", kind = "책", rating = 4, review = "", date = "2026-05-01", files = 0, pub = true, creator = "", album = "", withWhom = "" } = {}) {
  return {
    id,
    properties: {
      제목: { title: title === null ? [] : t(title) },
      종류: { select: kind === null ? null : { name: kind } },
      별점: { number: rating },
      "한 줄 감상": { rich_text: review ? t(review) : [] },
      날짜: { date: date ? { start: date } : null },
      "만든 사람": { rich_text: creator ? t(creator) : [] },
      앨범: { rich_text: album ? t(album) : [] },
      "함께한 사람": { rich_text: withWhom ? t(withWhom) : [] },
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
check("노래·공연·전시", () => assert.deepEqual(["노래", "공연", "전시"].map((k) => one({ kind: k }).kind), ["노래", "공연", "전시"]));
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
check("날짜 YYYY-MM-DD", () => assert.equal(one({ date: "2026-03-04" }).date, "2026-03-04"));
check("날짜+시간은 날짜만", () => assert.equal(one({ date: "2026-03-04T10:00:00.000+09:00" }).date, "2026-03-04"));
check("날짜 없음", () => assert.equal(one({ date: null }).date, null));
check("이상한 날짜", () => assert.equal(one({ date: "어제" }).date, null));
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
check("올해 숫자 (비공개·작년·날짜 없음 제외)", () => assert.deepEqual(countYear(mix, 2026), { 책: 2, 영화: 1, 노래: 0, 공연: 0, 전시: 0 }));
check("다른 해", () => assert.deepEqual(countYear(mix, 2025), { 책: 1, 영화: 0, 노래: 0, 공연: 0, 전시: 0 }));

// 새 칸
check("만든 사람·함께한 사람", () => { const x = one({ creator: " 한강 ", withWhom: "친구" }); assert.equal(x.creator, "한강"); assert.equal(x.withWhom, "친구"); });
check("앨범 칸은 노래일 때만", () => assert.equal(one({ kind: "책", album: "앨범" }).album, ""));

// 앨범 묶기
const songs = toShelfItems([
  page("s1", { kind: "노래", title: "곡1", album: "A", creator: "가수", date: "2026-03-01", rating: 5 }),
  page("s2", { kind: "노래", title: "곡2", album: "A", creator: "가수", date: "2026-05-01", rating: 4, files: 1 }),
  page("s3", { kind: "노래", title: "곡3", album: "a", creator: "가수", date: "2026-01-01", rating: null }),
  page("s4", { kind: "노래", title: "곡4", album: "A", creator: "다른 가수", date: "2026-04-01" }),
  page("s5", { kind: "노래", title: "싱글", album: "", creator: "가수", date: "2026-06-01" }),
  page("s6", { kind: "노래", title: "싱글2", album: "", creator: "가수", date: "2026-02-01" }),
  page("b1", { kind: "책", title: "책", album: "A", creator: "가수", date: "2026-04-15" }),
]);
const cards = toCards(songs);
const albumA = cards.find((c) => c.isAlbum && c.creator === "가수");
check("같은 앨범+같은 가수는 한 카드 (대소문자 무시)", () => assert.deepEqual(albumA.items.map((i) => i.id), ["s2", "s1", "s3"]));
check("가수가 다르면 다른 카드", () => assert.ok(cards.some((c) => c.isAlbum && c.items[0].id === "s4")));
check("앨범 칸이 빈 노래는 각각 카드", () => assert.equal(cards.filter((c) => !c.isAlbum && c.kind === "노래").length, 2));
check("책은 앨범 칸이 있어도 안 묶인다", () => assert.ok(cards.some((c) => c.key === "b1" && !c.isAlbum)));
check("앨범 카드 표지는 사진 있는 곡", () => assert.equal(albumA.coverId, "s2"));
check("앨범 카드 날짜는 가장 최근 곡", () => assert.equal(albumA.date, "2026-05-01"));
check("앨범 카드는 가장 최근 곡 자리에", () => assert.deepEqual(cards.map((c) => c.key.startsWith("album") ? "A:" + c.creator : c.key), ["s5", "A:가수", "b1", "A:다른 가수", "s6"]));
check("평균 별점 (빈 별점 제외)", () => assert.equal(averageRating(albumA.items), 4.5));
check("별점이 하나도 없으면 null", () => assert.equal(averageRating([{ rating: null }]), null));
check("노래 수는 곡 단위로 센다", () => assert.equal(countYear(songs, 2026).노래, 6));
check("한국 시간 연말 경계", () => assert.equal(seoulYear(new Date("2026-12-31T15:30:00Z")), 2027));
check("한국 시간 연초", () => assert.equal(seoulYear(new Date("2026-12-31T14:30:00Z")), 2026));

console.log(`\n모두 통과: ${n}개`);
