// 서버측 공고명 검색(bidNtceNm)으로 건수가 줄어드는지 + 정렬 확인
import { G2bClient } from "../build/lib/g2bClient.js"
const client = new G2bClient()
const now = new Date()
const p = (n) => String(n).padStart(2, "0")
const fmt = (d) => `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getMinutes() * 0 + d.getHours())}${p(d.getMinutes())}`
const end = fmt(now)
const bgn = fmt(new Date(now.getTime() - 30 * 864e5))

for (const kw of ["", "시스템", "AI", "유지보수", "홈페이지"]) {
  try {
    const res = await client.callOperation("getBidPblancListInfoServcPPSSrch", {
      inqryDiv: "1", inqryBgnDt: bgn, inqryEndDt: end, numOfRows: 5, pageNo: 1, bidNtceNm: kw || undefined,
    }, { useCache: false })
    console.log(`bidNtceNm="${kw || "(전체)"}" → totalCount=${res.totalCount}, 예: ${String(res.items[0]?.bidNtceNm ?? "").slice(0, 30)}`)
  } catch (e) {
    console.log(`bidNtceNm="${kw}" → 오류: ${e.message}`)
  }
}
process.exit(0)
