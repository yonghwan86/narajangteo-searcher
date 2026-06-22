/**
 * 상세조회 코어 — 공고번호로 목록 op + 보조 op 를 통합 조회 (캐시 활용)
 *
 * 별도 "상세조회" 오퍼레이션이 없으므로, 목록 op 를 inqryDiv=2 & bidNtceNo 로 호출해
 * 공고당 100여 필드를 가져온 뒤, 보조 op(기초금액/면허제한/참가지역/변경이력)를 합친다.
 */

import type { G2bClient } from "./g2bClient.js"
import type { BidNotice } from "./types.js"
import { normalizeBidNotice } from "./normalizer.js"
import {
  LIST_OP_BY_BUSINESS,
  BSIS_AMOUNT_OP_BY_BUSINESS,
  CHG_HSTRY_OP_BY_BUSINESS,
} from "./operations.js"

const BUSINESS_PROBE_ORDER = ["용역", "물품", "공사", "외자", "기타"] as const
export type Business = (typeof BUSINESS_PROBE_ORDER)[number]

export interface BidDetail {
  business: Business
  notice: BidNotice
  baseAmount?: Record<string, unknown>
  licenseLimits: Record<string, unknown>[]
  participableRegions: Record<string, unknown>[]
  changeHistory: Record<string, unknown>[]
}

/**
 * 공고번호로 통합 상세 조회.
 * @param bidNo 입찰공고번호
 * @param bidOrd 입찰공고차수 (선택)
 */
export async function fetchBidDetail(
  client: G2bClient,
  bidNo: string,
  bidOrd?: string
): Promise<BidDetail | null> {
  // 1) 업무구분 탐색: 목록 op 를 inqryDiv=2 & bidNtceNo 로 순차 호출
  let foundBusiness: Business | null = null
  let raw: Record<string, unknown> | null = null

  for (const business of BUSINESS_PROBE_ORDER) {
    const op = LIST_OP_BY_BUSINESS[business]
    const res = await client.callOperation(op, {
      inqryDiv: "2",
      bidNtceNo: bidNo,
      numOfRows: 10,
      pageNo: 1,
    })
    if (res.items.length > 0) {
      // 차수가 지정되면 일치 항목 우선
      const match = bidOrd
        ? res.items.find((it) => String(it.bidNtceOrd ?? "").trim() === bidOrd.trim())
        : undefined
      raw = match ?? res.items[0]
      foundBusiness = business
      break
    }
  }

  if (!foundBusiness || !raw) return null

  const notice = normalizeBidNotice(raw)

  // 2) 보조 op 통합 조회 (실패해도 상세 자체는 반환 — 부분 실패 허용)
  const [baseAmount, licenseLimits, participableRegions, changeHistory] = await Promise.all([
    fetchAuxSingle(client, BSIS_AMOUNT_OP_BY_BUSINESS[foundBusiness], bidNo),
    fetchAuxList(client, "getBidPblancListInfoLicenseLimit", bidNo),
    fetchAuxList(client, "getBidPblancListInfoPrtcptPsblRgn", bidNo),
    fetchAuxList(client, CHG_HSTRY_OP_BY_BUSINESS[foundBusiness], bidNo),
  ])

  return {
    business: foundBusiness,
    notice,
    baseAmount: baseAmount ?? undefined,
    licenseLimits,
    participableRegions,
    changeHistory,
  }
}

async function fetchAuxSingle(
  client: G2bClient,
  op: string | undefined,
  bidNo: string
): Promise<Record<string, unknown> | null> {
  if (!op) return null
  try {
    const res = await client.callOperation(op, { inqryDiv: "2", bidNtceNo: bidNo, numOfRows: 10, pageNo: 1 })
    return res.items[0] ?? null
  } catch {
    return null
  }
}

async function fetchAuxList(
  client: G2bClient,
  op: string | undefined,
  bidNo: string
): Promise<Record<string, unknown>[]> {
  if (!op) return []
  try {
    const res = await client.callOperation(op, { inqryDiv: "2", bidNtceNo: bidNo, numOfRows: 50, pageNo: 1 })
    return res.items
  } catch {
    return []
  }
}
