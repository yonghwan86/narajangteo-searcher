// 분담이행 필터 검증 — searchItBids(jointContractMethod) + 웹 /api/search?spldmdCd
import { G2bClient } from "../build/lib/g2bClient.js"
import { searchItBids } from "../build/tools/searchItBids.js"
import { startWebServer } from "../build/web/server.js"

const client = new G2bClient()

// 최근 10일 범위
const now = new Date()
const p = (n) => String(n).padStart(2, "0")
const fmt = (d) => `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`
const end = fmt(now)
const bgn = fmt(new Date(now.getTime() - 10 * 864e5))

// 1) MCP 도구: 분담이행만
const res = await searchItBids(client, {
  businessType: "용역",
  startDate: bgn,
  endDate: end,
  jointContractMethod: "분담이행",
  numOfRows: 500,
})
const text = res.content[0].text
const head = text.split("\n").slice(0, 4).join("\n")
console.log("=== MCP search_it_bids (분담이행) ===")
console.log(head)
// 본문에 공동수급 라인이 모두 '분담이행' 인지 간단 확인
const spldmdLines = text.split("\n").filter((l) => l.includes("공동수급"))
console.log("공동수급 표기 줄 수:", spldmdLines.length)
console.log("예시:", spldmdLines.slice(0, 3).map((s) => s.replace(/^- /, "").trim()))
const allBundam = spldmdLines.every((l) => l.includes("분담이행"))
console.log("모두 분담이행 포함:", allBundam)

// 2) 웹 API: spldmdCd=공500002
const { port } = await startWebServer(7801)
const j = await (await fetch(`http://localhost:${port}/api/search?business=용역&period=14&spldmdCd=공500002`)).json()
console.log("\n=== 웹 /api/search?spldmdCd=공500002 ===")
console.log("ok:", j.ok, "items:", j.items?.length)
if (j.items?.length) {
  const allOk = j.items.every((it) => String(it.spldmd).includes("분담이행"))
  console.log("모든 item 분담이행:", allOk)
  console.log("예시:", j.items.slice(0, 3).map((it) => `${it.spldmd} | ${it.title.slice(0, 30)}`))
}
process.exit(0)
