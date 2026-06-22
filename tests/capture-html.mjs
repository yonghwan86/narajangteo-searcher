// HTML 리포트 생성 검증 — search_it_bids 를 openInBrowser=true 로 호출하고 생성된 파일 확인
import { G2bClient } from "../build/lib/g2bClient.js"
import { searchItBids } from "../build/tools/searchItBids.js"
import { readFileSync } from "node:fs"

const client = new G2bClient()
const res = await searchItBids(client, { businessType: "용역", openInBrowser: true })
const text = res.content[0].text
const firstLines = text.split("\n").slice(0, 3).join("\n")
console.log("=== 응답 앞부분 ===")
console.log(firstLines)

const m = text.match(/파일:\s*(.+\.html)/)
if (!m) { console.log("FAIL: 파일 경로 안내 없음"); process.exit(1) }
const filePath = m[1].trim()
const html = readFileSync(filePath, "utf8")
console.log("=== HTML 파일 검증 ===")
console.log("path:", filePath)
console.log("length:", html.length)
console.log("has <table>:", html.includes("<table"))
console.log("has 정렬 script:", html.includes("addEventListener"))
console.log("row 수(<tr class):", (html.match(/<tr class=/g) || []).length)
console.log("has 원문 링크:", html.includes('target="_blank"'))
const ok = html.includes("<table") && html.includes("addEventListener") && html.includes("</html>")
console.log(ok ? "HTML PASS" : "HTML FAIL")
process.exit(ok ? 0 : 1)
