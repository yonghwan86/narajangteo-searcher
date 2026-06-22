// 진단: apis.data.go.kr 연결 실패의 실제 원인(cause)을 출력
const base = "apis.data.go.kr"

async function tryFetch(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    const text = await res.text()
    console.log(`OK  ${url}\n    status=${res.status} len=${text.length} head=${text.slice(0, 120).replace(/\s+/g, " ")}`)
    return true
  } catch (e) {
    const cause = e?.cause ? ` | cause=${e.cause.code || e.cause.message || e.cause}` : ""
    console.log(`ERR ${url}\n    ${e.name}: ${e.message}${cause}`)
    return false
  }
}

console.log("Node:", process.version)
console.log("proxy env:", {
  HTTP_PROXY: process.env.HTTP_PROXY || process.env.http_proxy || "(none)",
  HTTPS_PROXY: process.env.HTTPS_PROXY || process.env.https_proxy || "(none)",
  NO_PROXY: process.env.NO_PROXY || process.env.no_proxy || "(none)",
})

// 1) DNS/연결 기본 확인 (간단 GET, 키 없이 — 인증오류라도 '연결'은 성공으로 봄)
await tryFetch(`https://${base}/`)
await tryFetch(`http://${base}/`)

// 2) 실제 오퍼레이션 경로 (키 없이 — 연결만 보면 됨)
const op = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc?type=json&numOfRows=1&pageNo=1&inqryDiv=1&inqryBgnDt=202506010000&inqryEndDt=202506012359&serviceKey=TEST"
await tryFetch(op)
