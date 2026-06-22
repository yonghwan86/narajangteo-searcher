/**
 * find_deadline_urgent_bids — 마감 임박 IT 공고 찾기
 */

import { z } from "zod"
import type { G2bClient } from "../lib/g2bClient.js"
import type { LooseToolResponse } from "../lib/types.js"
import { formatToolError, notFoundResponse } from "../lib/errors.js"
import { deadlineSearchRange } from "../lib/dateutil.js"
import { fetchBids, applyItFilters } from "../lib/search-core.js"
import { calculateBidFitScore } from "../lib/scoring.js"
import { humanizeHours, formatMoneyShort } from "../lib/formatters.js"
import { display } from "../lib/normalizer.js"
import { truncateResponse } from "../lib/schemas.js"
import { openReportSafe } from "../lib/reportHelper.js"

export const FindDeadlineUrgentBidsSchema = z.object({
  withinHours: z.number().int().min(1).max(720).optional().default(72).describe("마감까지 N시간 이내 (기본 72)"),
  keywords: z.array(z.string()).optional().describe("IT 키워드 (미지정 시 기본 세트)"),
  maxResults: z.number().int().min(1).max(100).optional().default(20).describe("최대 결과 수 (기본 20)"),
  businessType: z.enum(["전체", "용역", "물품", "공사", "외자", "기타"]).optional().default("용역").describe("업무구분 (기본 용역, '전체'는 5개 업무 통합)"),
  openInBrowser: z.boolean().optional().default(false).describe("결과를 별도 브라우저 창(정렬·필터 가능한 HTML 표)으로 띄울지 여부"),
})

export type FindDeadlineUrgentBidsInput = z.infer<typeof FindDeadlineUrgentBidsSchema>

export async function findDeadlineUrgentBids(client: G2bClient, input: FindDeadlineUrgentBidsInput): Promise<LooseToolResponse> {
  try {
    const range = deadlineSearchRange()
    const fetched = await fetchBids(client, {
      business: input.businessType,
      inqryDiv: "1",
      inqryBgnDt: range.bgn,
      inqryEndDt: range.end,
      numOfRows: 300,
      pageNo: 1,
      usePPSSrch: true,
    })

    const itBids = applyItFilters(fetched.bids, { keywords: input.keywords })

    // 마감까지 남은 시간 0 이상 ~ withinHours 이내
    const urgent = itBids
      .filter((b) => b.hoursToDeadline !== undefined && b.hoursToDeadline >= 0 && b.hoursToDeadline <= input.withinHours)
      .sort((a, b) => (a.hoursToDeadline ?? Infinity) - (b.hoursToDeadline ?? Infinity))
      .slice(0, input.maxResults)

    if (urgent.length === 0) {
      return notFoundResponse(
        `마감 ${input.withinHours}시간 이내인 IT 공고가 없습니다. (업무구분 ${input.businessType})`,
        ["withinHours 를 늘려보세요.", "keywords 를 완화하세요."]
      )
    }

    const lines: string[] = []
    lines.push(`# 마감 임박 IT 공고 (${input.withinHours}시간 이내, ${input.businessType})`)
    lines.push("")
    lines.push(`> **${urgent.length}건** (마감 가까운 순)`)
    lines.push("")
    urgent.forEach((b, i) => {
      const score = calculateBidFitScore(b)
      const icon = score.decision === "바로 검토" ? "✅" : score.decision === "조건 확인 후 검토" ? "🟡" : "⛔"
      const title = b.title.length > 42 ? b.title.slice(0, 41) + "…" : b.title
      const money = b.estimatedPrice !== undefined ? formatMoneyShort(b.estimatedPrice) : "예산 미정"
      lines.push(`### ⏰ ${humanizeHours(b.hoursToDeadline)} · ${icon} ${score.decision}(${score.total}점)`)
      lines.push(`**${title}**`)
      lines.push("")
      lines.push(`- 🏢 ${display(b.agencyName)}`)
      lines.push(`- 📅 마감 **${display(b.closeDateTime)}**`)
      lines.push(`- 💰 ${money}`)
      if (b.qualificationSummary) lines.push(`- 📄 ${b.qualificationSummary}`)
      if (b.regionLimit) lines.push(`- 📍 ${b.regionLimit}`)
      if (b.originalUrl) lines.push(`- 🔗 [원문 보기](${b.originalUrl})`)
      lines.push("")
    })

    let prefix = ""
    if (input.openInBrowser) {
      const title = `마감 임박 IT 공고 (${input.withinHours}시간 이내, ${input.businessType})`
      const items = urgent.map((b) => ({ bid: b, score: calculateBidFitScore(b) }))
      prefix = (await openReportSafe(title, items, "deadline-urgent", fetched.totalCount)) + "\n"
    }

    return { content: [{ type: "text", text: prefix + truncateResponse(lines.join("\n")) }] }
  } catch (error) {
    return formatToolError(error, "find_deadline_urgent_bids")
  }
}
