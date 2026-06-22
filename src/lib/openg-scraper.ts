/**
 * 나라장터(차세대 g2b.go.kr) 개찰결과 "전체 투찰자 명단" 스크래퍼
 *
 * 공식 OpenAPI(낙찰정보서비스)는 개찰 1순위(낙찰예정자)만 제공하므로,
 * 나라장터 통합검색 상세화면이 사용하는 내부 엔드포인트를 재현해 투찰자 전원을 가져온다.
 *
 * 실측으로 확정된 호출 규약:
 *  - 세션 쿠키: g2b.go.kr GET 1회로 발급(로그인 불필요). 일정 시간 캐시.
 *  - 헤더 Menu-Info: {"menuNo":"15620","scrnNo":"08542"} (화면 식별 고정값, 비밀 아님)
 *  - POST 본문은 bidPbancNo(+Ord)만 사실상 의미. prcmBsneSeCd 등은 검증되지 않음(생략 가능).
 *  - 응답 result.successBidInfo[] 에 투찰자 전원.
 *  - recordCountPerPage 를 크게 주면 1회로 전원 수신(예: 729명 OK). nextRowYn=Y 면 페이징.
 *
 * ⚠️ 공식 OpenAPI가 아니라 내부 호출 재현이다. 나라장터 개편 시 menuNo/scrnNo/엔드포인트가
 *    바뀌면 깨질 수 있다(저위험·수정 용이). 과도한 반복 호출은 피한다(쿠키·결과 캐시 적용).
 */

import { bidCache } from "./cache.js"
import { parseAmount, formatDateTime, decodeEntities } from "./normalizer.js"
import { formatBizno } from "./opening-core.js"
import { fetchWithRetry } from "./fetch-with-retry.js"

const G2B_BASE = "https://www.g2b.go.kr"
const OPENG_URL = `${G2B_BASE}/pb/pbo/pboc/OnbsRslt/selectOnbsRsltSbidGods.do`
const MENU_INFO = JSON.stringify({ menuNo: "15620", scrnNo: "08542" })
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) g2b-it-bid"
const COOKIE_CACHE_KEY = "__g2b_session_cookie__"
const COOKIE_TTL = 5 * 60 * 1000

/** 정규화된 투찰업체 1건 (전체 명단의 한 행) */
export interface ScrapedBidder {
  /** 개찰순위 (1순위만 채워지는 경우가 많음) */
  rank?: number
  /** 사업자등록번호 (000-00-00000) */
  bizno?: string
  /** 업체명 */
  companyName?: string
  /** 대표자명 */
  ceoName?: string
  /** 투찰금액(원) */
  bidAmount?: number
  /** 투찰률(%) 문자열 */
  bidRate?: string
  /** 비고 (정상 / 협상평가부적격자 / 부적격 등) */
  remark?: string
  /** 투찰일시 "YYYY-MM-DD HH:mm" */
  bidDateTime?: string
}

export interface ScrapedOpeningResult {
  bidNo: string
  bidOrd: string
  bidName?: string
  opengDateTime?: string
  /** 참가업체 수 (totCnt) */
  participantCount: number
  bidders: ScrapedBidder[]
  source: "g2b-scrape"
}

/** Response 헤더에서 set-cookie 들을 "k=v; k=v" 형태로 합친다 */
function joinSetCookies(res: Response): string {
  const anyHeaders = res.headers as unknown as { getSetCookie?: () => string[] }
  const list = typeof anyHeaders.getSetCookie === "function" ? anyHeaders.getSetCookie() : []
  return list.map((c) => c.split(";")[0]).filter(Boolean).join("; ")
}

/** g2b.go.kr 세션 쿠키 발급(캐시). 로그인 불필요. */
async function getSessionCookie(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = bidCache.get<string>(COOKIE_CACHE_KEY)
    if (cached) return cached
  }
  const res = await fetchWithRetry(`${G2B_BASE}/`, { headers: { "User-Agent": UA } })
  const cookie = joinSetCookies(res)
  // 본문 스트림 정리
  try {
    await res.text()
  } catch {
    /* ignore */
  }
  if (cookie) bidCache.set(COOKIE_CACHE_KEY, cookie, COOKIE_TTL)
  return cookie
}

interface RawBidder {
  onbsRnkg?: unknown
  bzmnRegNo?: unknown
  grpNm?: unknown
  rprsvNm?: unknown
  bdngAmt?: unknown
  bdrt?: unknown
  etc?: unknown
  slprRcptnDt?: unknown
  totCnt?: unknown
  nextRowYn?: unknown
}

function str(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined
  const s = decodeEntities(String(v)).trim()
  return s === "" ? undefined : s
}

function toRank(v: unknown): number | undefined {
  const s = str(v)
  if (!s) return undefined
  const n = parseInt(s.replace(/[^0-9]/g, ""), 10)
  return isNaN(n) ? undefined : n
}

function normalizeBidder(r: RawBidder): ScrapedBidder {
  return {
    rank: toRank(r.onbsRnkg),
    bizno: formatBizno(str(r.bzmnRegNo)),
    companyName: str(r.grpNm),
    ceoName: str(r.rprsvNm),
    bidAmount: parseAmount(str(r.bdngAmt)),
    bidRate: str(r.bdrt),
    remark: str(r.etc),
    bidDateTime: formatDateTime(str(r.slprRcptnDt)),
  }
}

async function postBidders(bidNo: string, bidOrd: string, page: number, cookie: string): Promise<Response> {
  const body = JSON.stringify({
    dlSrchOnbsRsltBidInM: {
      bidPbancNo: bidNo,
      bidPbancOrd: bidOrd,
      bidClsfNo: "0",
      bidPrgrsOrd: "000",
      prcmBsneSeCd: "",
      bidPgstCd: "개찰완료",
      bzmnRegNo: "",
      reOpenPbancYN: "",
      currentPage: page,
      recordCountPerPage: "999",
    },
  })
  return fetchWithRetry(OPENG_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Menu-Info": MENU_INFO,
      "User-Agent": UA,
      Referer: `${G2B_BASE}/`,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body,
  })
}

/**
 * 특정 공고의 전체 투찰자 명단을 나라장터에서 가져온다.
 * @param bidNo 입찰공고번호 (예: 20240516360)
 * @param bidOrd 입찰공고차수 (기본 "000")
 */
export async function fetchAllBidders(bidNo: string, bidOrd = "000"): Promise<ScrapedOpeningResult> {
  const cacheKey = `g2b-openg:${bidNo}-${bidOrd}`
  const cached = bidCache.get<ScrapedOpeningResult>(cacheKey)
  if (cached) return cached

  const run = async (cookie: string): Promise<{ json: unknown; status: number }> => {
    const res = await postBidders(bidNo, bidOrd, 1, cookie)
    const text = await res.text()
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      json = { __raw: text.slice(0, 200) }
    }
    return { json, status: res.status }
  }

  let cookie = await getSessionCookie()
  let { json, status } = await run(cookie)

  // 403(세션 만료/누락) 시 쿠키 강제 재발급 후 1회 재시도
  if (status === 403) {
    cookie = await getSessionCookie(true)
    ;({ json, status } = await run(cookie))
  }

  const result = (json as { result?: Record<string, unknown> })?.result
  const rawList = (result?.successBidInfo as RawBidder[]) ?? []
  const bidInfo = (result?.bidInfo as Record<string, unknown>) ?? {}
  const etcData = (result?.etcData as Record<string, unknown>) ?? {}

  const bidders = rawList.map(normalizeBidder)
  const totCnt = rawList.length > 0 ? parseInt(String(rawList[0].totCnt ?? bidders.length), 10) : 0

  // 페이징: nextRowYn=Y 면 추가 페이지 수집 (recordCountPerPage=999 라 보통 1페이지로 끝남)
  let nextYn = rawList.length > 0 ? String(rawList[rawList.length - 1].nextRowYn ?? "N") : "N"
  let page = 1
  while (nextYn === "Y" && page < 20) {
    page += 1
    const res = await postBidders(bidNo, bidOrd, page, cookie)
    const text = await res.text()
    let more: RawBidder[] = []
    try {
      more = ((JSON.parse(text) as { result?: { successBidInfo?: RawBidder[] } }).result?.successBidInfo) ?? []
    } catch {
      break
    }
    if (more.length === 0) break
    bidders.push(...more.map(normalizeBidder))
    nextYn = String(more[more.length - 1].nextRowYn ?? "N")
  }

  const out: ScrapedOpeningResult = {
    bidNo,
    bidOrd,
    bidName: str(bidInfo.bidPbancNm),
    opengDateTime: formatDateTime(str(etcData.bidOpenDt)),
    participantCount: totCnt || bidders.length,
    bidders,
    source: "g2b-scrape",
  }
  if (bidders.length > 0) bidCache.set(cacheKey, out, 10 * 60 * 1000)
  return out
}
