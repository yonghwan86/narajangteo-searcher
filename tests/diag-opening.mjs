// 진단: 저장된 인증키로 개찰결과(낙찰정보서비스) 라이브 호출
// 화면 캡처의 실제 공고 20240516360-000 (용역) 으로 검증
import { loadConfig, applyToEnv } from "../build/web/config-store.js"
import { G2bClient } from "../build/lib/g2bClient.js"
import { fetchOpeningResult } from "../build/lib/opening-core.js"

applyToEnv(loadConfig())

const client = new G2bClient()
const bidNo = process.argv[2] || "20240516360"
const business = process.argv[3] || "용역"
const opengDate = process.argv[4] // 미지정 시 자동 조회

try {
  const r = await fetchOpeningResult(client, bidNo, business, { opengDate })
  console.log("operation:", r.operation, "| resultCode:", r.resultCode)
  console.log("bidName:", r.bidName, "| opengDateTime:", r.opengDateTime, "| 진행:", r.progressStatus)
  console.log("참가업체수(prtcptCnum):", r.participantCount)
  console.log("정규화된 업체 수:", r.bidders.length)
  console.log("note:", r.note)
  console.log("--- 결과 (구분/사업자번호/업체명/대표/금액/투찰률) ---")
  for (const b of r.bidders) {
    console.log(
      [b.source, b.bizno, b.companyName, b.ceoName, b.bidAmount, b.bidRate]
        .map((x) => (x === undefined ? "-" : x))
        .join(" | ")
    )
  }
} catch (e) {
  console.error("호출 실패:", e?.message ?? String(e))
  console.error("code:", e?.code)
}
