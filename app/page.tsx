// 첫 화면: 서버에서 노션을 읽어 공개 항목만 책장에 넘긴다.
import { getShelf } from "@/lib/shelf";
import { ShelfPage } from "./shelf-page";

export default async function Home() {
  return <ShelfPage shelf={await getShelf()} />;
}
