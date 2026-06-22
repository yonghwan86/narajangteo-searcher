/**
 * 개찰결과 조회·정규화 코어 (낙찰정보서비스 ScsbidInfoService)
 *
 * 실측으로 확정된 동작:
 *  - getOpengResultListInfoServc 는 공고 1건당 1행을 돌려준다.
 *  - 조회는 bidNtceNo 가 아니라 "개찰일시 날짜범위(inqryDiv=1, inqryBgnDt/EndDt, YYYYMMDDHHMM)"로만 가능.
 *    → 날짜범위로 받아 클라이언트에서 bidNtceNo 로 필터링한다.
 *  - 투찰업체 정보는 opengCorpInfo 필드에 "업체명^사업자번호^대표자^투찰금액^투찰률" 형태로 들어있다.
 *  - ⚠️ 공개되는 건 "개찰 1순위(낙찰예정자) 1개사"뿐이다. 참가업체 수는 prtcptCnum 으로 알 수 있으나
 *    전체 투찰자 명단(2·3순위 등)은 이 공공데이터셋으로는 제공되지 않는다.
 *  - getScsbidListSttusServc(낙찰자현황)는 최종 낙찰자(bidwinnrNm/Bizno...)를 별도 필드로 제공(확정 후).
 */

import type { G2bClient } from "./g2bClient.js"
import { OPENG_RESULT_OP_BY_BUSINESS, SCSBID_STTUS_OP_BY_BUSINESS, LIST_OP_BY_BUSINESS } from "./operations.js"
import { parseAmount, formatDateTime } from "./normalizer.js"
import { G2bApiError, ErrorCodes } from "./errors.js"

export type OpeningBusiness = "용역" | "물품" | "공사" | "외자"

/** 정규화된 투찰업체 1건 */
export interface OpeningBidder {
  /** 개찰순위 (opengCorpInfo 는 1순위/낙찰예정자) */
  rank?: number
  /** 사업자등록번호 (예: 621-81-96850) */
  bizno?: string
  /** 업체명 */
  companyName?: string
  /** 대표자명 */
  ceoName?: string
  /** 투찰금액(원) */
  bidAmount?: number
  /** 투찰률(%) 문자열 */
  bidRate?: string
  /** 정보 출처: opengResult(개찰1순위) | scsbid(최종낙찰자) */
  source: "opengResult" | "scsbid"
}

export interface OpeningResult {
  operation: string
  business: OpeningBusiness
  bidNo: string
  bidOrd?: string
  bidName?: string
  opengDateTime?: string
  /** 참가업체 수 (prtcptCnum) */
  participantCount?: number
  /** 진행상태 (예: 개찰완료) */
  progressStatus?: string
  bidders: OpeningBidder[]
  /** 전체 투찰자 명단이 공개되지 않는다는 한계 안내 */
  note: string
  resultCode: string
}

/** 10자리 사업자등록번호 → 000-00-00000 포맷 */
export function formatBizno(v: string | undefined): string | undefined {
  if (!v) return undefined
  const d = v.replace(/[^0-9]/g, "")
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
  return v.trim() || undefined
}

function s(raw: Record<string, unknown>, key: string): string | undefined {
  const v = raw[key]
  if (v === undefined || v === null) return undefined
  const t = String(v).trim()
  return t === "" ? undefined : t
}

/** "업체명^사업자번호^대표자^투찰금액^투찰률" → OpeningBidder */
function parseOpengCorpInfo(info: string | undefined): OpeningBidder | undefined {
  if (!info) return undefined
  const parts = info.split("^").map((x) => x.trim())
  if (parts.every((x) => x === "")) return undefined
  return {
    rank: 1,
    companyName: parts[0] || undefined,
    bizno: formatBizno(parts[1]),
    ceoName: parts[2] || undefined,
    bidAmount: parseAmount(parts[3]),
    bidRate: parts[4] || undefined,
    source: "opengResult",
  }
}

/** "YYYY-MM-DD HH:mm[:ss]" 또는 YYYYMMDD → YYYYMMDD */
function toYmd(v: string | undefined): string | undefined {
  if (!v) return undefined
  const digits = v.replace(/[^0-9]/g, "")
  return digits.length >= 8 ? digits.slice(0, 8) : undefined
}

/** 공고번호로 개찰일(YYYYMMDD)을 조회 (개찰결과는 날짜범위로만 조회 가능하므로 필요) */
async function resolveOpengYmd(
  client: G2bClient,
  bidNo: string,
  business: OpeningBusiness
): Promise<string | undefined> {
  const listOp = LIST_OP_BY_BUSINESS[business]
  if (!listOp) return undefined
  const res = await client.callOperation(listOp, { inqryDiv: "2", bidNtceNo: bidNo, numOfRows: 10, pageNo: 1 })
  for (const it of res.items) {
    const ymd = toYmd(s(it, "opengDt"))
    if (ymd) return ymd
  }
  return undefined
}

/**
 * 개찰결과 조회.
 * @param opts.opengDate 개찰일 'YYYY-MM-DD' 또는 'YYYYMMDD'. 미지정 시 공고번호로 자동 조회.
 * @param opts.bidOrd 입찰공고차수 (예: 000)
 */
export async function fetchOpeningResult(
  client: G2bClient,
  bidNo: string,
  business: OpeningBusiness,
  opts: { opengDate?: string; bidOrd?: string } = {}
): Promise<OpeningResult> {
  const operation = OPENG_RESULT_OP_BY_BUSINESS[business]
  if (!operation) throw new G2bApiError(`지원하지 않는 업무구분: ${business}`, ErrorCodes.INVALID_PARAM)

  const ymd = toYmd(opts.opengDate) ?? (await resolveOpengYmd(client, bidNo, business))
  if (!ymd) {
    throw new G2bApiError(
      `공고 '${bidNo}'의 개찰일을 확인하지 못했습니다.`,
      ErrorCodes.NOT_FOUND,
      [
        "아직 개찰 전이거나 공고번호/업무구분이 일치하지 않을 수 있습니다.",
        "개찰일(opengDate, 예: 2024-06-07)을 직접 지정해 보세요.",
      ]
    )
  }

  // 개찰결과 목록 — 해당일 00:00~23:59 범위 조회 후 bidNtceNo 로 필터
  const res = await client.callOperation(operation, {
    inqryDiv: "1",
    inqryBgnDt: `${ymd}0000`,
    inqryEndDt: `${ymd}2359`,
    numOfRows: 999,
    pageNo: 1,
  })

  const matched = res.items.filter(
    (it) => String(it.bidNtceNo ?? "") === bidNo && (!opts.bidOrd || String(it.bidNtceOrd ?? "") === opts.bidOrd)
  )

  const bidders: OpeningBidder[] = []
  let bidName: string | undefined
  let opengDateTime: string | undefined
  let participantCount: number | undefined
  let progressStatus: string | undefined

  for (const row of matched) {
    bidName = bidName ?? s(row, "bidNtceNm")
    opengDateTime = opengDateTime ?? formatDateTime(s(row, "opengDt"))
    progressStatus = progressStatus ?? s(row, "progrsDivCdNm")
    const pc = parseInt(s(row, "prtcptCnum") ?? "", 10)
    if (!isNaN(pc)) participantCount = pc
    const b = parseOpengCorpInfo(s(row, "opengCorpInfo"))
    if (b) bidders.push(b)
  }

  // 최종 낙찰자현황으로 보강 (확정된 경우만)
  try {
    const sttusOp = SCSBID_STTUS_OP_BY_BUSINESS[business]
    if (sttusOp) {
      const sres = await client.callOperation(sttusOp, {
        inqryDiv: "1",
        inqryBgnDt: `${ymd}0000`,
        inqryEndDt: `${ymd}2359`,
        numOfRows: 999,
        pageNo: 1,
      })
      const swin = sres.items.find((it) => String(it.bidNtceNo ?? "") === bidNo)
      if (swin) {
        const exists = bidders.some((b) => b.bizno === formatBizno(s(swin, "bidwinnrBizno")))
        if (!exists && (s(swin, "bidwinnrNm") || s(swin, "bidwinnrBizno"))) {
          bidders.push({
            rank: 1,
            companyName: s(swin, "bidwinnrNm"),
            bizno: formatBizno(s(swin, "bidwinnrBizno")),
            ceoName: s(swin, "bidwinnrCeoNm"),
            bidAmount: parseAmount(s(swin, "sucsfbidAmt")),
            bidRate: s(swin, "sucsfbidRate"),
            source: "scsbid",
          })
        }
      }
    }
  } catch {
    /* 낙찰자현황 보강 실패는 무시 (개찰결과만으로 반환) */
  }

  const note =
    participantCount !== undefined && participantCount > bidders.length
      ? `참가 ${participantCount}개사 중 공공데이터로는 개찰 1순위(낙찰예정자) ${bidders.length}개사만 공개됩니다. 전체 투찰자 명단(2·3순위 등)은 OpenAPI로 제공되지 않습니다.`
      : "공공데이터는 개찰 1순위(낙찰예정자) 정보를 제공합니다. 전체 투찰자 명단은 OpenAPI로 제공되지 않을 수 있습니다."

  return {
    operation,
    business,
    bidNo,
    bidOrd: opts.bidOrd,
    bidName,
    opengDateTime,
    participantCount,
    progressStatus,
    bidders,
    note,
    resultCode: res.resultCode,
  }
}
