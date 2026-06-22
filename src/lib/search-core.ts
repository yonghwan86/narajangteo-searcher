/**
 * 검색 코어 — 여러 도구가 공유하는 "조회 + 정규화 + IT 필터" 로직
 */

import type { G2bClient } from "./g2bClient.js"
import type { BidNotice } from "./types.js"
import { normalizeBidNotice } from "./normalizer.js"
import { PPSSRCH_OP_BY_BUSINESS, LIST_OP_BY_BUSINESS } from "./operations.js"
import { matchesItKeywords, matchesExcludeKeywords, DEFAULT_IT_KEYWORDS } from "./keywords.js"

/** 업무구분 (전체 = 5개 업무를 합쳐 조회) */
export type Business = "용역" | "물품" | "공사" | "외자" | "기타"
export const ALL_BUSINESSES: Business[] = ["용역", "물품", "공사", "외자", "기타"]

export interface SearchBidsParams {
  /** 업무구분 (기본 용역, "전체"면 5개 업무 통합 조회) */
  business?: Business | "전체"
  /** 조회구분 (PPSSrch: 1 공고게시일시, 2 개찰일시) */
  inqryDiv?: string
  /** 조회 기간 (YYYYMMDDHHMM) */
  inqryBgnDt?: string
  inqryEndDt?: string
  /** 서버측 검색 필터 (PPSSrch 전용) */
  bidNtceNm?: string
  prtcptLmtRgnCd?: string
  indstrytyCd?: string
  presmptPrceBgn?: number
  presmptPrceEnd?: number
  /** 페이징 */
  numOfRows?: number
  pageNo?: number
  /** PPSSrch(검색조건) 사용 여부. false면 목록 op 사용 (기본 true) */
  usePPSSrch?: boolean
}

export interface SearchBidsResult {
  totalCount: number
  pageNo: number
  numOfRows: number
  bids: BidNotice[]
}

/** PPSSrch/목록 op 호출 후 정규화 (IT 필터는 적용 안 함 — 원본 목록) */
export async function fetchBids(client: G2bClient, params: SearchBidsParams): Promise<SearchBidsResult> {
  const business = params.business ?? "용역"

  // "전체"면 5개 업무를 병렬 조회 후 병합 (공고번호+차수 기준 중복 제거)
  if (business === "전체") {
    const results = await Promise.all(
      ALL_BUSINESSES.map((b) => fetchBids(client, { ...params, business: b }).catch(() => null))
    )
    const seen = new Set<string>()
    const merged: BidNotice[] = []
    let totalCount = 0
    for (const r of results) {
      if (!r) continue
      totalCount += r.totalCount
      for (const bid of r.bids) {
        const key = `${bid.bidNo}-${bid.bidOrd ?? ""}`
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(bid)
      }
    }
    return { totalCount, pageNo: params.pageNo ?? 1, numOfRows: merged.length, bids: merged }
  }

  const usePPSSrch = params.usePPSSrch ?? true
  const operationName = usePPSSrch
    ? PPSSRCH_OP_BY_BUSINESS[business]
    : LIST_OP_BY_BUSINESS[business]

  const apiParams: Record<string, string | number | undefined> = {
    inqryDiv: params.inqryDiv ?? "1",
    inqryBgnDt: params.inqryBgnDt,
    inqryEndDt: params.inqryEndDt,
    numOfRows: params.numOfRows ?? 100,
    pageNo: params.pageNo ?? 1,
  }
  if (usePPSSrch) {
    apiParams.bidNtceNm = params.bidNtceNm
    apiParams.prtcptLmtRgnCd = params.prtcptLmtRgnCd
    apiParams.indstrytyCd = params.indstrytyCd
    apiParams.presmptPrceBgn = params.presmptPrceBgn
    apiParams.presmptPrceEnd = params.presmptPrceEnd
  }

  const res = await client.callOperation(operationName, apiParams)
  return {
    totalCount: res.totalCount,
    pageNo: res.pageNo,
    numOfRows: res.numOfRows,
    bids: res.items.map(normalizeBidNotice),
  }
}

export interface ItFilterOptions {
  keywords?: string[]
  excludeKeywords?: string[]
  minBudget?: number
  maxBudget?: number
  region?: string
  includeNationwide?: boolean
  deadlineWithinDays?: number
  /** 공동수급방식코드 (예: 공500002 분담이행). 지정 시 해당 코드 공고만 */
  spldmdCd?: string
  /** 키워드 필터를 건너뜀 (서버측 공고명 검색을 이미 한 경우) */
  skipKeyword?: boolean
}

/** 클라이언트단 IT 키워드/예산/지역/마감 필터 */
export function applyItFilters(bids: BidNotice[], opts: ItFilterOptions): BidNotice[] {
  const keywords = opts.keywords && opts.keywords.length > 0 ? opts.keywords : DEFAULT_IT_KEYWORDS
  const exclude = opts.excludeKeywords ?? []

  return bids.filter((b) => {
    // IT 키워드 (공고명 + 기관명) — 서버측 검색을 이미 했다면 skip
    if (!opts.skipKeyword) {
      const haystack = `${b.title} ${b.demandOrgName ?? ""} ${b.agencyName ?? ""}`
      if (!matchesItKeywords(haystack, keywords)) return false
    }
    if (matchesExcludeKeywords(b.title, exclude)) return false

    // 예산 (추정가격 기준)
    const price = b.estimatedPrice ?? b.baseAmount
    if (opts.minBudget !== undefined && (price === undefined || price < opts.minBudget)) return false
    if (opts.maxBudget !== undefined && price !== undefined && price > opts.maxBudget) return false

    // 지역
    if (opts.region) {
      const limit = b.regionLimit ?? ""
      const isNationwide = !limit || /전국|제한없음|없음/.test(limit)
      const matchRegion = limit.includes(opts.region)
      if (!(matchRegion || (opts.includeNationwide && isNationwide))) return false
    }

    // 마감 N일 이내
    if (opts.deadlineWithinDays !== undefined && b.hoursToDeadline !== undefined) {
      if (b.hoursToDeadline < 0 || b.hoursToDeadline > opts.deadlineWithinDays * 24) return false
    }

    // 공동수급방식 (선택한 코드와 정확히 일치)
    if (opts.spldmdCd && (b.spldmdCd ?? "") !== opts.spldmdCd) return false

    return true
  })
}
