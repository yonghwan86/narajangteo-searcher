import { startWebServer } from "../build/web/server.js"
const { port } = await startWebServer(7791)
const base = `http://localhost:${port}`

// 1) 전체 투찰자 라우트
const r1 = await fetch(`${base}/api/openg-bidders?bidNo=20240516360&bidOrd=000`)
const j1 = await r1.json()
console.log("[/api/openg-bidders] ok:", j1.ok, "| 참가:", j1.participantCount, "| 수신:", j1.count, "|", j1.bidName)
for (const b of (j1.bidders||[])) console.log("  ", b.rank ?? "-", b.bizno, b.companyName, b.bidAmountText, b.remark)

// 2) 마감 공고 검색 (개찰결과 탭)
const p = new URLSearchParams({ business:"전체", period:"180", closedOnly:"1", keywords:"보안성검증" })
const r2 = await fetch(`${base}/api/search?${p}`)
const j2 = await r2.json()
console.log("\n[/api/search closedOnly] ok:", j2.ok, "| 마감공고:", j2.totalCount, "| 표시:", (j2.items||[]).length)
for (const it of (j2.items||[]).slice(0,5)) console.log("  ", it.bidNo, "| 마감:", it.closeDateTime, "| 개찰:", it.opengDate, "|", (it.title||"").slice(0,30))
process.exit(0)
