/**
 * recommend_bids_for_small_it_company — IT 소기업 기준 참여 가능성 높은 공고 추천
 */

import { z } from "zod"
import type { G2bClient } from "../lib/g2bClient.js"
import type { LooseToolResponse, BidNotice, BidScore, CompanyProfile } from "../lib/types.js"
import { formatToolError, notFoundResponse } from "../lib/errors.js"
import { recentDaysRange } from "../lib/dateutil.js"
import { fetchBids, applyItFilters } from "../lib/search-core.js"
import { calculateBidFitScore } from "../lib/scoring.js"
import { formatBidBlock, bidKey, formatMoneyShort } from "../lib/formatters.js"
import { openReportSafe } from "../lib/reportHelper.js"
import { truncateResponse } from "../lib/schemas.js"

const CompanyProfileSchema = z.object({
  regions: z.array(z.string()).optional().describe("회사 소재/참여 가능 지역 (예: ['서울','경기'])"),
  capabilities: z.array(z.string()).optional().describe("보유 역량 (예: ['웹 개발','AI'])"),
  preferredBudgetMin: z.number().optional().describe("선호 예산 하한(원)"),
  preferredBudgetMax: z.number().optional().describe("선호 예산 상한(원)"),
  hasSoftwareBusinessRegistration: z.boolean().optional().describe("소프트웨어사업자 신고 여부"),
  hasDirectProductionCertificate: z.boolean().optional().describe("직접생산확인증명서 보유"),
  hasSmallBusinessConfirmation: z.boolean().optional().describe("소기업확인서 보유"),
  hasVentureCertification: z.boolean().optional().describe("벤처기업 인증"),
  hasWomenEnterpriseCertification: z.boolean().optional().describe("여성기업 인증"),
  hasDisabilityEnterpriseCertification: z.boolean().optional().describe("장애인기업 인증"),
})

export const RecommendBidsSchema = z.object({
  companyProfile: CompanyProfileSchema.optional().describe("회사 프로필 (미지정 시 기본 IT 소기업 프로필)"),
  days: z.number().int().min(1).max(30).optional().default(7).describe("최근 N일 이내 공고 (기본 7)"),
  maxResults: z.number().int().min(1).max(100).optional().default(20).describe("최대 추천 건수 (기본 20)"),
  businessType: z.enum(["전체", "용역", "물품", "공사", "외자", "기타"]).optional().default("용역").describe("업무구분 (기본 용역, '전체'는 5개 업무 통합)"),
  openInBrowser: z.boolean().optional().default(false).describe("결과를 별도 브라우저 창(정렬·필터 가능한 HTML 표)으로 띄울지 여부"),
})

export type RecommendBidsInput = z.infer<typeof RecommendBidsSchema>

export async function recommendBids(client: G2bClient, input: RecommendBidsInput): Promise<LooseToolResponse> {
  try {
    const profile: CompanyProfile = input.companyProfile ?? {}
    const range = recentDaysRange(input.days)

    const fetched = await fetchBids(client, {
      business: input.businessType,
      inqryDiv: "1",
      inqryBgnDt: range.bgn,
      inqryEndDt: range.end,
      numOfRows: 300,
      pageNo: 1,
      usePPSSrch: true,
    })

    // IT 필터 + 예산(프로필 선호 범위) 필터
    const filtered = applyItFilters(fetched.bids, {
      minBudget: profile.preferredBudgetMin,
      maxBudget: profile.preferredBudgetMax,
    })

    if (filtered.length === 0) {
      return notFoundResponse(
        `최근 ${input.days}일간 추천할 IT 공고가 없습니다. (업무구분 ${input.businessType}, API 전체 ${fetched.totalCount}건)`,
        ["days 를 늘려보세요.", "companyProfile 의 예산 범위를 완화하세요."]
      )
    }

    const scored: Array<{ bid: BidNotice; score: BidScore }> = filtered
      .map((bid) => ({ bid, score: calculateBidFitScore(bid, profile) }))
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, input.maxResults)

    const buckets: Record<BidScore["decision"], typeof scored> = {
      "바로 검토": [],
      "조건 확인 후 검토": [],
      비추천: [],
    }
    for (const s of scored) buckets[s.score.decision].push(s)

    const lines: string[] = []
    lines.push(`# IT 소기업 맞춤 추천 (최근 ${input.days}일, ${input.businessType})`)
    lines.push("")
    lines.push(`- 후보 ${filtered.length}건 중 상위 ${scored.length}건 추천`)
    lines.push(`- 분류: 바로 검토 ${buckets["바로 검토"].length} / 조건 확인 ${buckets["조건 확인 후 검토"].length} / 비추천 ${buckets["비추천"].length}`)
    lines.push("")

    // 요약 리스트 (빠른 훑어보기)
    lines.push("## 📊 추천 순위 — 빠른 훑어보기")
    lines.push("")
    scored.forEach((s, i) => {
      const icon = s.score.decision === "바로 검토" ? "✅" : s.score.decision === "조건 확인 후 검토" ? "🟡" : "⛔"
      const title = s.bid.title.length > 42 ? s.bid.title.slice(0, 41) + "…" : s.bid.title
      const money = s.bid.estimatedPrice !== undefined ? formatMoneyShort(s.bid.estimatedPrice) : "예산 미정"
      const deadline = s.bid.closeDateTime ? `~${s.bid.closeDateTime.slice(5, 16)}` : "마감 미정"
      lines.push(`${i + 1}. ${icon} **${s.score.total}점** ${title}\n   └ ${s.bid.agencyName ?? "확인 필요"} · ${money} · ${deadline}`)
    })
    lines.push("")

    // 분류별 상세
    for (const decision of ["바로 검토", "조건 확인 후 검토", "비추천"] as const) {
      const group = buckets[decision]
      if (group.length === 0) continue
      lines.push(`## ${decision} (${group.length}건)`)
      const map = new Map<string, BidScore>()
      group.forEach(({ bid, score }) => map.set(bidKey(bid), score))
      group.forEach(({ bid, score }, i) => {
        lines.push("")
        lines.push(formatBidBlock(i + 1, bid, score))
      })
      lines.push("")
    }

    let prefix = ""
    if (input.openInBrowser) {
      const title = `IT 소기업 맞춤 추천 (최근 ${input.days}일, ${input.businessType})`
      prefix = (await openReportSafe(title, scored.map((s) => ({ bid: s.bid, score: s.score })), "recommend-bids", fetched.totalCount)) + "\n"
    }

    return { content: [{ type: "text", text: prefix + truncateResponse(lines.join("\n")) }] }
  } catch (error) {
    return formatToolError(error, "recommend_bids_for_small_it_company")
  }
}
