// 웹앱 스모크: 서버 기동 → /api/config → /api/search 호출 검증
import { startWebServer } from "../build/web/server.js"

const { url, port } = await startWebServer(7799)
console.log("server:", url)

// 1) config 상태
const cfg = await (await fetch(`http://localhost:${port}/api/config`)).json()
console.log("hasKey:", cfg.hasKey)

// 2) UI 페이지
const html = await (await fetch(`http://localhost:${port}/`)).text()
console.log("UI page <title> 포함:", html.includes("나라장터 IT 입찰공고 검색기"), "length:", html.length)

// 3) 검색 (HTTPS→HTTP 자동 폴백 동작 확인 — 환경변수로 https 강제)
const r = await fetch(`http://localhost:${port}/api/search?business=용역&period=today`)
const j = await r.json()
console.log("search ok:", j.ok, "needKey:", j.needKey, "error:", j.error || "(none)")
if (j.ok) {
  console.log("totalCount:", j.totalCount, "items:", j.items.length)
  if (j.items[0]) {
    const it = j.items[0]
    console.log("top item:", { rank: it.rank, total: it.total, decision: it.decision, title: it.title.slice(0, 30), price: it.priceShort })
  }
}
process.exit(0)
