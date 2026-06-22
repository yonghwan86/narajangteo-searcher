// HTTP로 오퍼레이션 호출 시 data.go.kr 정상 응답 구조(또는 인증오류 봉투)가 오는지 확인 (키 없이)
const op = "http://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc?type=json&numOfRows=1&pageNo=1&inqryDiv=1&inqryBgnDt=202506010000&inqryEndDt=202506012359&serviceKey=TESTKEY"
try {
  const res = await fetch(op, { signal: AbortSignal.timeout(15000) })
  const text = await res.text()
  console.log("status:", res.status)
  console.log("content-type:", res.headers.get("content-type"))
  console.log("body(앞 400자):", text.slice(0, 400).replace(/\s+/g, " "))
} catch (e) {
  console.log("ERR", e.name, e.message, e?.cause?.code || "")
}
