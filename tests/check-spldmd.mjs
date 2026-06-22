// 공동수급방식/협정서접수방식 필드 실측 + '분담이행' 공고 찾기
import { G2bClient } from "../build/lib/g2bClient.js"

const client = new G2bClient()

// 최근 약 10일 공사 공고 (공동수급은 공사에 많음)
const now = new Date()
const p = (n) => String(n).padStart(2, "0")
const fmt = (d) => `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`
const end = fmt(now)
const bgnDate = new Date(now.getTime() - 10 * 24 * 3600 * 1000)
const bgn = fmt(new Date(bgnDate.getFullYear(), bgnDate.getMonth(), bgnDate.getDate(), 0, 0))

console.log(`조회기간: ${bgn} ~ ${end} (공사 목록)`)

const res = await client.callOperation("getBidPblancListInfoCnstwk", {
  inqryDiv: "1",
  inqryBgnDt: bgn,
  inqryEndDt: end,
  numOfRows: 500,
  pageNo: 1,
})

console.log(`총 ${res.totalCount}건 중 ${res.items.length}건 수신\n`)

// 1) 공동수급방식(Cd/Nm) 분포
const byMethod = new Map()
const byRcpt = new Map()
for (const it of res.items) {
  const cd = String(it.cmmnSpldmdMethdCd ?? "").trim()
  const nm = String(it.cmmnSpldmdMethdNm ?? "").trim()
  const key = `${cd || "(없음)"} / ${nm || "(없음)"}`
  byMethod.set(key, (byMethod.get(key) || 0) + 1)
  const rcpt = String(it.cmmnSpldmdAgrmntRcptdocMethd ?? "").trim() || "(없음)"
  byRcpt.set(rcpt, (byRcpt.get(rcpt) || 0) + 1)
}

console.log("=== 공동수급방식코드/명 분포 (cmmnSpldmdMethdCd / cmmnSpldmdMethdNm) ===")
;[...byMethod.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${v}건  ${k}`))

console.log("\n=== 공동수급협정서접수방식 분포 (cmmnSpldmdAgrmntRcptdocMethd) ===")
;[...byRcpt.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${v}건  ${k}`))

// 2) '분담이행' 공고 찾기 (코드 공500002 또는 명에 '분담' 포함)
const bundam = res.items.filter((it) => {
  const cd = String(it.cmmnSpldmdMethdCd ?? "")
  const nm = String(it.cmmnSpldmdMethdNm ?? "")
  return cd === "공500002" || nm.includes("분담")
})

console.log(`\n=== '분담이행' 관련 공고: ${bundam.length}건 ===`)
bundam.slice(0, 10).forEach((it, i) => {
  console.log(`${i + 1}. [${it.cmmnSpldmdMethdCd}/${it.cmmnSpldmdMethdNm}] ${it.bidNtceNo} - ${String(it.bidNtceNm).slice(0, 40)}`)
  console.log(`    협정서접수방식: ${it.cmmnSpldmdAgrmntRcptdocMethd ?? "-"} / 협정마감: ${it.cmmnSpldmdAgrmntClseDt ?? "-"}`)
})
process.exit(0)
