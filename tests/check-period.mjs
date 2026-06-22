// 긴 기간(90/180일) 동작 확인: 에러 여부, totalCount, 결과 정렬 순서
import { G2bClient } from "../build/lib/g2bClient.js"
const client = new G2bClient()
const now = new Date()
const p = (n) => String(n).padStart(2, "0")
const fmt = (d) => `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`

for (const days of [30, 90, 180]) {
  const bgn = fmt(new Date(now.getTime() - days * 864e5))
  const end = fmt(now)
  try {
    const res = await client.callOperation("getBidPblancListInfoServcPPSSrch", {
      inqryDiv: "1", inqryBgnDt: bgn, inqryEndDt: end, numOfRows: 10, pageNo: 1,
    }, { useCache: false })
    const first = res.items[0]
    const last = res.items[res.items.length - 1]
    console.log(`[${days}일] totalCount=${res.totalCount}, 수신=${res.items.length}`)
    console.log(`   1번째 공고일: ${first?.bidNtceDt ?? "?"} / 마지막: ${last?.bidNtceDt ?? "?"}`)
  } catch (e) {
    console.log(`[${days}일] 오류: ${e.message}`)
  }
}

// 마지막 페이지 확인 (정렬이 최신순인지: pageNo 큰 값이 오래된 건지)
try {
  const bgn = fmt(new Date(now.getTime() - 90 * 864e5)), end = fmt(now)
  const r1 = await client.callOperation("getBidPblancListInfoServcPPSSrch", { inqryDiv:"1", inqryBgnDt:bgn, inqryEndDt:end, numOfRows:5, pageNo:1 }, {useCache:false})
  console.log("\npage1 첫 공고일:", r1.items[0]?.bidNtceDt)
  const lastPage = Math.max(1, Math.ceil(r1.totalCount / 5))
  const r2 = await client.callOperation("getBidPblancListInfoServcPPSSrch", { inqryDiv:"1", inqryBgnDt:bgn, inqryEndDt:end, numOfRows:5, pageNo:lastPage }, {useCache:false})
  console.log(`page${lastPage} 첫 공고일:`, r2.items[0]?.bidNtceDt)
} catch(e){ console.log("정렬확인 오류:", e.message) }
process.exit(0)
