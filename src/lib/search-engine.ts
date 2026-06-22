/**
 * 검색 엔진 — 나라장터 웹 방식
 * - 서버측 공고명 검색(bidNtceNm)으로 IT 공고만 받아 볼륨을 줄인다
 * - API의 ~1개월 기간 제한을 우회하기 위해 기간을 30일 단위 윈도우로 분할
 * - 각 쿼리를 페이지네이션하고, 업무구분(전체=5종)·키워드·윈도우를 합쳐 중복 제거
 * - 일 1,000건 트래픽 보호를 위해 총 호출 수를 maxQueries로 제한
 */

import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import type { G2bClient } from "./g2bClient.js"
import type { BidNotice } from "./types.js"
import { normalizeBidNotice } from "./normalizer.js"
import { PPSSRCH_OP_BY_BUSINESS } from "./operations.js"
import { ALL_BUSINESSES, type Business, applyItFilters } from "./search-core.js"
import { calculateBidFitScore } from "./scoring.js"
import { CORE_IT_SEARCH_TERMS } from "./keywords.js"
import type { BidScore, CompanyProfile } from "./types.js"

dayjs.extend(customParseFormat)

const FMT = "YYYYMMDDHHmm"

/** [bgn,end] (YYYYMMDDHHMM) 를 maxDays 이하 윈도우로 분할 */
export function splitWindows(bgn: string, end: string, maxDays = 30): Array<{ bgn: string; end: string }> {
  const start0 = dayjs(bgn, FMT, true)
  const final = dayjs(end, FMT, true)
  if (!start0.isValid() || !final.isValid() || !start0.isBefore(final)) {
    return [{ bgn, end }]
  }
  const out: Array<{ bgn: string; end: string }> = []
  let start = start0
  let guard = 0
  while (start.isBefore(final) && guard++ < 60) {
    let chunkEnd = start.add(maxDays, "day")
    if (chunkEnd.isAfter(final)) chunkEnd = final
    out.push({ bgn: start.format(FMT), end: chunkEnd.format(FMT) })
    start = chunkEnd.add(1, "minute")
  }
  return out
}

export interface EngineParams {
  business: Business | "전체"
  /** 서버측 공고명 검색어 목록 */
  keywords: string[]
  bgn: string
  end: string
  /** 쿼리당 최대 페이지 (기본 3, numOfRows 999 → 최대 ~3000건/쿼리) */
  maxPagesPerQuery?: number
  /** 총 API 호출 상한 (트래픽 보호, 기본 90) */
  maxQueries?: number
  /** 동시 호출 수 (기본 6) */
  concurrency?: number
}

export interface EngineResult {
  bids: BidNotice[]
  apiCalls: number
  /** maxQueries 도달로 일부 생략됨 */
  truncated: boolean
}

/** 간단한 동시성 제한 실행기 */
async function runPool<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const results: T[] = []
  let i = 0
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (i < tasks.length) {
      const idx = i++
      results[idx] = await tasks[idx]()
    }
  })
  await Promise.all(workers)
  return results
}

export async function searchByKeywords(client: G2bClient, p: EngineParams): Promise<EngineResult> {
  const businesses: Business[] = p.business === "전체" ? ALL_BUSINESSES : [p.business]
  const windows = splitWindows(p.bgn, p.end)
  const maxPages = p.maxPagesPerQuery ?? 3
  const maxQueries = p.maxQueries ?? 90
  const concurrency = p.concurrency ?? 10

  // (op, window, keyword) 조합의 1페이지 쿼리 목록 구성
  type Q = { op: string; bgn: string; end: string; kw: string }
  const baseQueries: Q[] = []
  for (const b of businesses) {
    const op = PPSSRCH_OP_BY_BUSINESS[b]
    for (const w of windows) {
      for (const kw of p.keywords) {
        baseQueries.push({ op, bgn: w.bgn, end: w.end, kw })
      }
    }
  }

  let truncated = false
  let budget = maxQueries
  const seen = new Set<string>()
  const bids: BidNotice[] = []
  let apiCalls = 0

  const collect = (items: Record<string, unknown>[]) => {
    for (const raw of items) {
      const bid = normalizeBidNotice(raw)
      const key = `${bid.bidNo}-${bid.bidOrd ?? ""}`
      if (seen.has(key)) continue
      seen.add(key)
      bids.push(bid)
    }
  }

  // 1페이지 일괄 실행 (예산 내에서)
  const firstBatch = baseQueries.slice(0, budget)
  if (firstBatch.length < baseQueries.length) truncated = true
  budget -= firstBatch.length

  const followups: Array<() => Promise<void>> = []
  const firstTasks = firstBatch.map((q) => async () => {
    try {
      const res = await client.callOperation(q.op, {
        inqryDiv: "1",
        inqryBgnDt: q.bgn,
        inqryEndDt: q.end,
        bidNtceNm: q.kw,
        numOfRows: 999,
        pageNo: 1,
      })
      apiCalls++
      collect(res.items)
      // 추가 페이지 필요 시 followup 등록
      const totalPages = Math.min(maxPages, Math.ceil(res.totalCount / 999))
      for (let page = 2; page <= totalPages; page++) {
        const pg = page
        followups.push(async () => {
          try {
            const r = await client.callOperation(q.op, {
              inqryDiv: "1",
              inqryBgnDt: q.bgn,
              inqryEndDt: q.end,
              bidNtceNm: q.kw,
              numOfRows: 999,
              pageNo: pg,
            })
            apiCalls++
            collect(r.items)
          } catch {
            /* skip */
          }
        })
      }
    } catch {
      /* skip this query */
    }
  })

  await runPool(firstTasks, concurrency)

  // 추가 페이지 실행 (예산 내)
  if (followups.length > budget) {
    truncated = true
    followups.length = budget
  }
  await runPool(followups, concurrency)

  // 같은 공고번호의 여러 차수(재공고/변경공고)는 최신 차수 하나만 남김
  return { bids: collapseLatestOrd(bids), apiCalls, truncated }
}

/** 동일 bidNo 중 가장 높은 차수(bidNtceOrd)만 유지 */
function collapseLatestOrd(bids: BidNotice[]): BidNotice[] {
  const best = new Map<string, BidNotice>()
  for (const b of bids) {
    const cur = best.get(b.bidNo)
    if (!cur) {
      best.set(b.bidNo, b)
      continue
    }
    const ordNew = parseInt(b.bidOrd ?? "0", 10) || 0
    const ordCur = parseInt(cur.bidOrd ?? "0", 10) || 0
    if (ordNew > ordCur) best.set(b.bidNo, b)
  }
  return [...best.values()]
}

// ── 통합 IT 검색 (서버측 키워드 검색 + 클라이언트 필터 + 점수) ──

export interface ItSearchInput {
  business: Business | "전체"
  bgn: string
  end: string
  /** 서버측 공고명 검색어 (없으면 핵심 IT 키워드 사용) */
  keywords?: string[]
  excludeKeywords?: string[]
  minBudget?: number
  maxBudget?: number
  region?: string
  includeNationwide?: boolean
  deadlineWithinDays?: number
  spldmdCd?: string
  maxQueries?: number
  /** 점수 계산용 회사 프로필 (선택) */
  profile?: CompanyProfile
}

export interface ItSearchOutput {
  bids: BidNotice[]
  scores: Map<string, BidScore>
  apiCalls: number
  truncated: boolean
  /** 필터 전 서버검색 매칭 건수 */
  matchedBeforeFilter: number
}

export async function runItSearch(client: G2bClient, input: ItSearchInput): Promise<ItSearchOutput> {
  const serverTerms = input.keywords && input.keywords.length > 0 ? input.keywords : CORE_IT_SEARCH_TERMS
  const eng = await searchByKeywords(client, {
    business: input.business,
    keywords: serverTerms,
    bgn: input.bgn,
    end: input.end,
    maxQueries: input.maxQueries,
  })

  const filtered = applyItFilters(eng.bids, {
    excludeKeywords: input.excludeKeywords,
    minBudget: input.minBudget,
    maxBudget: input.maxBudget,
    region: input.region,
    includeNationwide: input.includeNationwide ?? true,
    deadlineWithinDays: input.deadlineWithinDays,
    spldmdCd: input.spldmdCd,
    skipKeyword: true, // 서버측에서 이미 공고명으로 검색함
  })

  const scores = new Map<string, BidScore>()
  const scored = filtered.map((bid) => {
    const s = calculateBidFitScore(bid, input.profile ?? {})
    scores.set(`${bid.bidNo}-${bid.bidOrd ?? ""}`, s)
    return { bid, s }
  })
  scored.sort((a, b) => b.s.total - a.s.total)

  return {
    bids: scored.map((x) => x.bid),
    scores,
    apiCalls: eng.apiCalls,
    truncated: eng.truncated,
    matchedBeforeFilter: eng.bids.length,
  }
}
