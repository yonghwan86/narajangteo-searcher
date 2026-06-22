// 새 검색엔진 검증: 전체 업무구분, 장기간(3개월), 키워드 정확도
import { startWebServer } from "../build/web/server.js"
const { port } = await startWebServer(7805)
const call = async (qs) => (await fetch(`http://localhost:${port}/api/search?${qs}`)).json()

console.log("1) 용역 / 오늘:")
let j = await call("business=용역&period=today")
console.log("   items:", j.items?.length, "서버매칭:", j.totalCount, "API호출:", j.apiCalls, "truncated:", j.truncated)

console.log("2) 전체 / 오늘:")
j = await call("business=전체&period=today")
console.log("   items:", j.items?.length, "API호출:", j.apiCalls, "truncated:", j.truncated)
console.log("   업무 다양성(분류 종류):", new Set(j.items.map((x) => x.itCategory)).size)

console.log("3) 용역 / 최근 3개월 (90일, 월분할):")
j = await call("business=용역&period=90")
console.log("   items:", j.items?.length, "서버매칭:", j.totalCount, "API호출:", j.apiCalls, "truncated:", j.truncated)
if (j.items?.length) {
  // 마감일 분포로 장기간 커버 확인
  const dates = j.items.map((x) => x.closeDateTime).filter(Boolean).sort()
  console.log("   마감일 범위:", dates[0], "~", dates[dates.length - 1])
}

console.log("4) 용역 / 오늘 / 키워드 '홈페이지' (서버측 검색):")
j = await call("business=용역&period=30&keywords=홈페이지")
console.log("   items:", j.items?.length, "API호출:", j.apiCalls)
const allHomepage = j.items.every((x) => x.title.includes("홈페이지") || x.title.includes("누리집") || x.title.includes("웹"))
console.log("   예시:", j.items.slice(0, 3).map((x) => x.title.slice(0, 24)))
process.exit(0)
