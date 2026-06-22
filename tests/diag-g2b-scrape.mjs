// 실현가능성 최종 증명: 순수 Node에서 나라장터 통합검색 상세 개찰결과(전체 투찰자) 가져오기
// 1) GET 으로 세션 쿠키 발급(로그인 없음)  2) Menu-Info 헤더 + POST  3) successBidInfo 전원 파싱
const BASE = "https://www.g2b.go.kr"
const OPENG_URL = `${BASE}/pb/pbo/pboc/OnbsRslt/selectOnbsRsltSbidGods.do`
const MENU_INFO = JSON.stringify({ menuNo: "15620", scrnNo: "08542" })

const bidPbancNo = process.argv[2] || "20240516360"
const bidPbancOrd = process.argv[3] || "000"
const prcmBsneSeCd = process.argv[4] || "03" // 03=용역

function cookiesFrom(res) {
  // node fetch: getSetCookie() (Node 20+) 또는 raw header
  const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : []
  return list.map((c) => c.split(";")[0]).join("; ")
}

// 1) 세션 쿠키 발급
const g = await fetch(BASE + "/", { headers: { "User-Agent": "Mozilla/5.0" } })
let cookie = cookiesFrom(g)
console.log("GET status:", g.status, "| 쿠키 수:", cookie.split(";").filter(Boolean).length)

// 2) 개찰결과 POST
const body = JSON.stringify({
  dlSrchOnbsRsltBidInM: {
    bidPbancNo, bidPbancOrd, bidClsfNo: "0", bidPrgrsOrd: "000",
    prcmBsneSeCd, bidPgstCd: "개찰완료", bzmnRegNo: "", reOpenPbancYN: "",
    currentPage: 1, recordCountPerPage: "50",
  },
})
const r = await fetch(OPENG_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Menu-Info": MENU_INFO,
    "User-Agent": "Mozilla/5.0",
    Referer: BASE + "/",
    ...(cookie ? { Cookie: cookie } : {}),
  },
  body,
})
const text = await r.text()
console.log("POST status:", r.status)
let j
try { j = JSON.parse(text) } catch { console.log("JSON 파싱 실패. head:", text.slice(0, 200)); process.exit(1) }
const list = j?.result?.successBidInfo || []
console.log("투찰자 수:", list.length)
console.log("--- 전체 투찰자 명단 (순위 | 사업자번호 | 업체명 | 대표 | 투찰금액 | 비고 | 투찰일시) ---")
for (const b of list) {
  console.log([b.onbsRnkg, b.bzmnRegNo, b.grpNm, b.rprsvNm, b.bdngAmt, b.etc, b.slprRcptnDt].join(" | "))
}
if (!list.length) console.log("head:", text.slice(0, 300))
