/**
 * get_bid_detail — 특정 공고번호 통합 상세조회 (IT 소기업 관점 요약)
 */

import { z } from "zod"
import type { G2bClient } from "../lib/g2bClient.js"
import type { LooseToolResponse } from "../lib/types.js"
import { formatToolError, notFoundResponse } from "../lib/errors.js"
import { fetchBidDetail } from "../lib/detail-core.js"
import { calculateBidFitScore } from "../lib/scoring.js"
import { formatBidBlock } from "../lib/formatters.js"
import { formatMoney, display, parseAmount } from "../lib/normalizer.js"
import { truncateResponse } from "../lib/schemas.js"

export const GetBidDetailSchema = z.object({
  bidNo: z.string().min(1).describe("입찰공고번호 (예: R25BK00932003)"),
  bidOrd: z.string().optional().describe("입찰공고차수 (예: 000). 미지정 시 첫 항목"),
})

export type GetBidDetailInput = z.infer<typeof GetBidDetailSchema>

function str(raw: Record<string, unknown>, key: string): string | undefined {
  const v = raw[key]
  if (v === undefined || v === null) return undefined
  const s = String(v).trim()
  return s === "" ? undefined : s
}

export async function getBidDetail(client: G2bClient, input: GetBidDetailInput): Promise<LooseToolResponse> {
  try {
    const detail = await fetchBidDetail(client, input.bidNo, input.bidOrd)
    if (!detail) {
      return notFoundResponse(`공고번호 '${input.bidNo}'에 해당하는 입찰공고를 찾지 못했습니다.`, [
        "공고번호가 정확한지 확인하세요.",
        "차수(bidOrd)를 함께 지정해 보세요.",
      ])
    }

    const { notice, business, baseAmount, licenseLimits, participableRegions, changeHistory } = detail
    const score = calculateBidFitScore(notice)

    const lines: string[] = []
    lines.push(`# 입찰공고 상세 (${business}) — ${notice.title}`)
    lines.push("")
    lines.push(formatBidBlock(1, notice, score))
    lines.push("")

    // 기초금액 보강
    if (baseAmount) {
      const amt = parseAmount(str(baseAmount, "bssamt")) ?? parseAmount(str(baseAmount, "baseAmount"))
      lines.push("## 기초금액 정보")
      lines.push(`- 기초금액: ${formatMoney(amt)}`)
      const rsrvtnPrceRng = str(baseAmount, "rsrvtnPrceRngBgnRate") || str(baseAmount, "rngBgnRate")
      if (rsrvtnPrceRng) lines.push(`- 예비가격범위: ${rsrvtnPrceRng}`)
      lines.push("")
    }

    // 면허/업종 제한
    lines.push("## 면허·업종 제한")
    if (licenseLimits.length === 0) {
      lines.push("- 등록된 면허제한 정보 없음 (확인 필요)")
    } else {
      for (const lic of licenseLimits.slice(0, 10)) {
        const nm = str(lic, "indstrytyNm") || str(lic, "lcnsLmtNm") || str(lic, "indstrytyCd") || "(항목)"
        lines.push(`- ${nm}`)
      }
    }
    lines.push("")

    // 참가가능지역
    lines.push("## 참가가능지역")
    if (participableRegions.length === 0) {
      lines.push("- 지역 제한 정보 없음 → 전국 참여 가능성 (확인 필요)")
    } else {
      const rgns = participableRegions
        .map((r) => str(r, "prtcptPsblRgnNm") || str(r, "rgnNm"))
        .filter(Boolean)
      lines.push(`- ${rgns.length > 0 ? rgns.join(", ") : "정보 파싱 불가(확인 필요)"}`)
    }
    lines.push("")

    // 변경이력
    if (changeHistory.length > 0) {
      lines.push(`## 변경이력 (${changeHistory.length}건)`)
      for (const ch of changeHistory.slice(0, 5)) {
        const dt = str(ch, "chgDt") || str(ch, "bidNtceDt") || ""
        const reason = str(ch, "chgRsn") || str(ch, "rgstTyNm") || ""
        lines.push(`- ${dt} ${reason}`.trim())
      }
      lines.push("")
    }

    // IT 소기업 관점 요약
    lines.push("## IT 소기업 관점 요약")
    lines.push(`- 사업 범위: ${notice.title}`)
    lines.push(`- 예산: 추정가격 ${formatMoney(notice.estimatedPrice)} / 기초금액 ${formatMoney(notice.baseAmount)}`)
    lines.push(`- 참가자격: ${display(notice.qualificationSummary)}`)
    lines.push(`- 제한사항: 지역제한 ${display(notice.regionLimit)}`)
    lines.push(`- 일정: 마감 ${display(notice.closeDateTime)}, 개찰 ${display(notice.openDateTime)}`)
    lines.push(`- 리스크: ${score.risks.length ? score.risks.join("; ") : "특이사항 없음(추정)"}`)
    lines.push(`- 우리 회사 확인사항: 업종/면허 보유 여부, 인력·기간 충족 여부, 제출서류 준비`)
    lines.push(`- 다음 액션: create_bid_review_memo 로 검토 메모 작성 권장`)
    if (notice.originalUrl) lines.push(`- 원문 링크: ${notice.originalUrl}`)

    return { content: [{ type: "text", text: truncateResponse(lines.join("\n")) }] }
  } catch (error) {
    return formatToolError(error, "get_bid_detail")
  }
}
