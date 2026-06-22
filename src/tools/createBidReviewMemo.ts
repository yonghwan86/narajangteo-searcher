/**
 * create_bid_review_memo — 대표가 바로 판단할 수 있는 입찰 검토 메모 생성
 */

import { z } from "zod"
import type { G2bClient } from "../lib/g2bClient.js"
import type { LooseToolResponse } from "../lib/types.js"
import { formatToolError, notFoundResponse } from "../lib/errors.js"
import { fetchBidDetail } from "../lib/detail-core.js"
import { calculateBidFitScore } from "../lib/scoring.js"
import { formatMoney, display } from "../lib/normalizer.js"
import { humanizeHours } from "../lib/formatters.js"
import { truncateResponse } from "../lib/schemas.js"

export const CreateBidReviewMemoSchema = z.object({
  bidNo: z.string().min(1).describe("입찰공고번호 (예: R25BK00932003)"),
  bidOrd: z.string().optional().describe("입찰공고차수"),
  companyName: z.string().optional().describe("우리 회사명 (메모에 표기)"),
  companyStrengths: z.array(z.string()).optional().describe("우리 회사 강점 (예: ['공공 SI 실적','AI 역량'])"),
})

export type CreateBidReviewMemoInput = z.infer<typeof CreateBidReviewMemoSchema>

export async function createBidReviewMemo(client: G2bClient, input: CreateBidReviewMemoInput): Promise<LooseToolResponse> {
  try {
    const detail = await fetchBidDetail(client, input.bidNo, input.bidOrd)
    if (!detail) {
      return notFoundResponse(`공고번호 '${input.bidNo}'를 찾지 못해 메모를 작성할 수 없습니다.`, [
        "공고번호/차수를 확인하세요.",
      ])
    }

    const { notice } = detail
    const strengths = input.companyStrengths ?? []
    // 강점을 capability 로 활용해 점수 산출
    const score = calculateBidFitScore(notice, strengths.length ? { capabilities: strengths } : {})
    const company = input.companyName ?? "우리 회사"

    const lines: string[] = []
    lines.push(`# 입찰 참여 검토 메모`)
    lines.push(`> 대상: ${company} / 공고번호 ${notice.bidNo}${notice.bidOrd ? ` (차수 ${notice.bidOrd})` : ""}`)
    lines.push("")

    lines.push("## 1. 공고 개요")
    lines.push(`- 공고명: ${notice.title}`)
    lines.push(`- 발주기관: ${display(notice.agencyName)} / 수요기관: ${display(notice.demandOrgName)}`)
    lines.push(`- 업무구분: ${detail.business} / 분류: ${display(notice.itCategory)}`)
    lines.push(`- 계약방법: ${display(notice.contractMethod)} / 입찰방식: ${display(notice.bidMethod)}`)
    lines.push("")

    lines.push("## 2. 사업 내용 요약")
    lines.push(`- ${notice.title}`)
    lines.push(`- (상세 과업은 원문/규격서 확인 필요)`)
    if (notice.originalUrl) lines.push(`- 원문: ${notice.originalUrl}`)
    lines.push("")

    lines.push("## 3. 예산 및 계약 조건")
    lines.push(`- 추정가격: ${formatMoney(notice.estimatedPrice)}`)
    lines.push(`- 기초금액: ${formatMoney(notice.baseAmount)}`)
    lines.push(`- 공고일시: ${display(notice.noticeDateTime)}`)
    lines.push(`- 입찰마감: ${display(notice.closeDateTime)} (${humanizeHours(notice.hoursToDeadline)})`)
    lines.push(`- 개찰일시: ${display(notice.openDateTime)}`)
    lines.push("")

    lines.push("## 4. 참가자격")
    lines.push(`- ${display(notice.qualificationSummary)}`)
    lines.push(`- 지역제한: ${display(notice.regionLimit)}`)
    if (detail.licenseLimits.length > 0) lines.push(`- 면허/업종 제한: ${detail.licenseLimits.length}건 등록 (get_bid_detail 참조)`)
    lines.push("")

    lines.push("## 5. 우리 회사 적합성")
    lines.push(`- 적합도 점수: **${score.total}점 → ${score.decision}**`)
    if (strengths.length) lines.push(`- 강점 매칭: ${strengths.join(", ")}`)
    if (score.reasons.length) lines.push(`- 적합 사유: ${score.reasons.join("; ")}`)
    lines.push("")

    lines.push("## 6. 예상 리스크")
    if (score.risks.length) {
      score.risks.forEach((r) => lines.push(`- ${r}`))
    } else {
      lines.push("- 특이 리스크 없음 (추정) — 과업 범위/제출서류는 원문 확인 필요")
    }
    lines.push("")

    lines.push("## 7. 수주 가능성 판단")
    lines.push(`- 종합 판단: **${score.decision}** (${score.total}점)`)
    lines.push(`- 세부: 역량 ${score.categoryFit}/30, 예산 ${score.budgetFit}/20, 마감 ${score.deadlineFit}/15, 지역 ${score.regionFit}/10, 소기업 ${score.smallBusinessFit}/15, 경쟁 ${score.competitionFit}/10`)
    lines.push("")

    lines.push("## 8. 준비해야 할 서류")
    lines.push("- 입찰참가자격등록증, 사업자등록증, 관련 면허/업종 등록증")
    lines.push("- (해당 시) 소프트웨어사업자 신고확인서, 직접생산확인증명서, 소기업확인서")
    lines.push("- 실적증명, 기술자 보유현황, 제안서/산출내역서 (공고 규격서 확인)")
    lines.push("")

    lines.push("## 9. 대표 의사결정")
    const recommendation =
      score.decision === "바로 검토" ? "참여 추천" : score.decision === "조건 확인 후 검토" ? "보류(조건 확인 후 결정)" : "비추천"
    lines.push(`- 결정: **${recommendation}**`)
    lines.push(`- 판단 근거: 적합도 ${score.total}점. ${score.reasons.slice(0, 2).join("; ") || "정보 제한적"}.`)
    if (score.risks.length) lines.push(`- 유의: ${score.risks.slice(0, 2).join("; ")}`)

    return { content: [{ type: "text", text: truncateResponse(lines.join("\n")) }] }
  } catch (error) {
    return formatToolError(error, "create_bid_review_memo")
  }
}
