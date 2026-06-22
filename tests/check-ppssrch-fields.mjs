// PPSSrch(검색조건) 응답에 공동수급방식 필드가 있는지 확인
import { G2bClient } from "../build/lib/g2bClient.js"
const client = new G2bClient()

const now = new Date()
const p = (n) => String(n).padStart(2, "0")
const fmt = (d) => `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`
const end = fmt(now)
const bgn = fmt(new Date(now.getTime() - 7 * 864e5))

for (const op of ["getBidPblancListInfoCnstwkPPSSrch", "getBidPblancListInfoServcPPSSrch"]) {
  const res = await client.callOperation(op, { inqryDiv: "1", inqryBgnDt: bgn, inqryEndDt: end, numOfRows: 100, pageNo: 1 })
  const sample = res.items[0] || {}
  const hasCd = "cmmnSpldmdMethdCd" in sample
  const hasNm = "cmmnSpldmdMethdNm" in sample
  console.log(`\n[${op}] 수신 ${res.items.length}건 / cmmnSpldmdMethdCd 존재: ${hasCd}, Nm 존재: ${hasNm}`)
  if (hasCd) {
    const dist = new Map()
    for (const it of res.items) {
      const k = `${String(it.cmmnSpldmdMethdCd ?? "(없음)")}/${String(it.cmmnSpldmdMethdNm ?? "")}`
      dist.set(k, (dist.get(k) || 0) + 1)
    }
    ;[...dist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => console.log(`   ${v}건  ${k}`))
  } else {
    // 어떤 키들이 있는지 일부 출력
    console.log("   사용 가능한 키(일부):", Object.keys(sample).slice(0, 25).join(", "))
  }
}
process.exit(0)
