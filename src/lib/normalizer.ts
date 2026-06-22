/**
 * raw API item → BidNotice 표준 타입 변환
 * - 금액 문자열 → number
 * - 날짜 문자열 → YYYY-MM-DD HH:mm
 * - 없는 값 → "확인 필요"
 */

import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import type { BidNotice } from "./types.js"
import { classifyItCategory } from "./keywords.js"

dayjs.extend(customParseFormat)

export const UNKNOWN = "확인 필요"

/** &#40;주&#41; 처럼 HTML 엔티티로 인코딩된 값을 실제 문자로 복원 */
export function decodeEntities(s: string): string {
  if (s.indexOf("&") === -1) return s
  const named: Record<string, string> = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&nbsp;": " ",
  }
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&[a-zA-Z]+;/g, (m) => named[m.toLowerCase()] ?? m)
}

/** raw 값에서 문자열 추출 (없으면 undefined) */
function str(raw: Record<string, unknown>, key: string): string | undefined {
  const v = raw[key]
  if (v === undefined || v === null) return undefined
  const s = decodeEntities(String(v)).trim()
  return s === "" ? undefined : s
}

/** 금액 문자열 → number (콤마/공백 제거). 변환 불가 시 undefined */
export function parseAmount(v: string | undefined): number | undefined {
  if (v === undefined) return undefined
  const cleaned = v.replace(/[,\s원]/g, "")
  if (cleaned === "" || !/^-?\d+(\.\d+)?$/.test(cleaned)) return undefined
  const n = Number(cleaned)
  return isNaN(n) ? undefined : n
}

/**
 * 날짜 문자열 → "YYYY-MM-DD HH:mm".
 * API는 "YYYY-MM-DD HH:MM:SS", "YYYY-MM-DD HH:MM", "YYYYMMDDHHMM" 등 혼재.
 */
export function formatDateTime(v: string | undefined): string | undefined {
  if (v === undefined) return undefined
  const s = v.trim()
  if (s === "") return undefined
  const formats = ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DD", "YYYYMMDDHHmm", "YYYYMMDD"]
  for (const fmt of formats) {
    const d = dayjs(s, fmt, true)
    if (d.isValid()) return d.format("YYYY-MM-DD HH:mm")
  }
  // 마지막 시도: 느슨한 파싱
  const loose = dayjs(s)
  if (loose.isValid()) return loose.format("YYYY-MM-DD HH:mm")
  return s // 원형 보존
}

/** 마감일시까지 남은 시간(시간 단위). 계산 불가 시 undefined */
export function hoursUntil(closeDateTime: string | undefined, now: dayjs.Dayjs = dayjs()): number | undefined {
  if (!closeDateTime) return undefined
  const formats = ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"]
  let d = null
  for (const fmt of formats) {
    const parsed = dayjs(closeDateTime, fmt, true)
    if (parsed.isValid()) {
      d = parsed
      break
    }
  }
  if (!d) {
    const loose = dayjs(closeDateTime)
    if (loose.isValid()) d = loose
  }
  if (!d) return undefined
  return d.diff(now, "hour", true)
}

/**
 * 지역제한 요약 추출 — 응답에 참가제한지역명 필드가 있으면 사용,
 * 없으면 "확인 필요"(목록 op엔 지역 필드가 없을 수 있음).
 */
function extractRegionLimit(raw: Record<string, unknown>): string | undefined {
  return (
    str(raw, "prtcptLmtRgnNm") ||
    str(raw, "prtcptPsblRgnNm") ||
    str(raw, "rgnLmtBidLocplcJdgmBssCd")
  )
}

/** 참가자격 요약 (업종제한/입찰참가제한 등에서 조립) */
function extractQualificationSummary(raw: Record<string, unknown>): string | undefined {
  const parts: string[] = []
  const indstrytyLmt = str(raw, "indstrytyLmtYn")
  if (indstrytyLmt === "Y") parts.push("업종(면허)제한 있음")
  const bidPrtcptLmt = str(raw, "bidPrtcptLmtYn")
  if (bidPrtcptLmt === "Y") parts.push("입찰참가제한 있음")
  const indstrytyNm = str(raw, "indstrytyNm") || str(raw, "mainCnsttyNm")
  if (indstrytyNm) parts.push(`업종: ${indstrytyNm}`)
  return parts.length > 0 ? parts.join(", ") : undefined
}

/** 입찰공고 raw item → BidNotice */
export function normalizeBidNotice(raw: Record<string, unknown>): BidNotice {
  const title = str(raw, "bidNtceNm") || UNKNOWN
  const closeDateTime = formatDateTime(str(raw, "bidClseDt"))

  return {
    bidNo: str(raw, "bidNtceNo") || UNKNOWN,
    bidOrd: str(raw, "bidNtceOrd"),
    title,
    agencyName: str(raw, "ntceInsttNm"),
    demandOrgName: str(raw, "dminsttNm"),
    businessType: str(raw, "bsnsDivNm") || str(raw, "indstrytyNm"),
    contractMethod: str(raw, "cntrctCnclsMthdNm"),
    bidMethod: str(raw, "bidMethdNm"),
    noticeDateTime: formatDateTime(str(raw, "bidNtceDt")),
    closeDateTime,
    openDateTime: formatDateTime(str(raw, "opengDt")),
    estimatedPrice: parseAmount(str(raw, "presmptPrce")) ?? parseAmount(str(raw, "bdgtAmt")),
    baseAmount: parseAmount(str(raw, "bssamt")) ?? parseAmount(str(raw, "baseAmount")),
    regionLimit: extractRegionLimit(raw),
    qualificationSummary: extractQualificationSummary(raw),
    spldmdCd: str(raw, "cmmnSpldmdMethdCd"),
    spldmdNm: str(raw, "cmmnSpldmdMethdNm"),
    originalUrl: str(raw, "bidNtceDtlUrl") || str(raw, "bidNtceUrl"),
    itCategory: classifyItCategory(title),
    hoursToDeadline: hoursUntil(closeDateTime),
    raw,
  }
}

/** 금액을 "12,000,000원" 형태로 포맷 (없으면 "확인 필요") */
export function formatMoney(amount: number | undefined): string {
  if (amount === undefined) return UNKNOWN
  return `${amount.toLocaleString("ko-KR")}원`
}

/** 표시용: undefined 면 "확인 필요" */
export function display(v: string | undefined): string {
  return v ?? UNKNOWN
}
