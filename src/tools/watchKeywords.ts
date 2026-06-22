/**
 * watch_keywords — 키워드 기반 최근 공고 검색 (중복 제거)
 */

import { z } from "zod"
import type { G2bClient } from "../lib/g2bClient.js"
import type { LooseToolResponse, BidNotice } from "../lib/types.js"
import { formatToolError, notFoundResponse } from "../lib/errors.js"
import { recentDaysRange } from "../lib/dateutil.js"
import { fetchBids } from "../lib/search-core.js"
import { matchesItKeywords } from "../lib/keywords.js"
import { display } from "../lib/normalizer.js"
import { bidKey } from "../lib/formatters.js"
import { truncateResponse } from "../lib/schemas.js"

export const WatchKeywordsSchema = z.object({
  keywords: z.array(z.string()).min(1).describe("감시할 키워드 목록 (예: ['AI','데이터분석'])"),
  days: z.number().int().min(1).max(30).optional().default(3).describe("최근 N일 (기본 3)"),
  maxResults: z.number().int().min(1).max(100).optional().default(30).describe("최대 결과 수 (기본 30)"),
  businessType: z.enum(["전체", "용역", "물품", "공사", "외자", "기타"]).optional().default("용역").describe("업무구분 (기본 용역, '전체'는 5개 업무 통합)"),
})

export type WatchKeywordsInput = z.infer<typeof WatchKeywordsSchema>

export async function watchKeywords(client: G2bClient, input: WatchKeywordsInput): Promise<LooseToolResponse> {
  try {
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

    // 키워드별 매칭 + 전체 중복 제거
    const seen = new Set<string>()
    const byKeyword = new Map<string, BidNotice[]>()
    for (const kw of input.keywords) byKeyword.set(kw, [])

    for (const bid of fetched.bids) {
      const haystack = `${bid.title} ${bid.demandOrgName ?? ""} ${bid.agencyName ?? ""}`
      for (const kw of input.keywords) {
        if (matchesItKeywords(haystack, [kw])) {
          byKeyword.get(kw)!.push(bid)
        }
      }
    }

    const totalMatched = [...byKeyword.values()].reduce((acc, arr) => acc + arr.length, 0)
    if (totalMatched === 0) {
      return notFoundResponse(
        `최근 ${input.days}일간 키워드(${input.keywords.join(", ")})에 매칭되는 공고가 없습니다. (업무구분 ${input.businessType})`,
        ["days 를 늘려보세요.", "키워드를 더 일반적인 단어로 바꿔보세요."]
      )
    }

    const lines: string[] = []
    lines.push(`# 키워드 감시 결과 (최근 ${input.days}일, ${input.businessType})`)
    lines.push("")

    let shownCount = 0
    for (const kw of input.keywords) {
      const matches = byKeyword.get(kw)!
      lines.push(`## "${kw}" — ${matches.length}건`)
      if (matches.length === 0) {
        lines.push("- (매칭 없음)")
        lines.push("")
        continue
      }
      for (const bid of matches) {
        if (shownCount >= input.maxResults) break
        const key = bidKey(bid)
        const isNew = !seen.has(key)
        if (isNew) seen.add(key)
        const tag = isNew ? "🆕" : "↩(중복)"
        lines.push(`- ${tag} ${bid.title}`)
        lines.push(`  - 공고번호 ${bid.bidNo} / 기관 ${display(bid.agencyName)} / 마감 ${display(bid.closeDateTime)}`)
        shownCount++
      }
      lines.push("")
      if (shownCount >= input.maxResults) {
        lines.push(`> 표시 한도(${input.maxResults}건) 도달 — 일부 결과는 생략되었습니다.`)
        break
      }
    }

    lines.push(`---`)
    lines.push(`- 고유 공고 ${seen.size}건 (키워드 중복 제외)`)

    return { content: [{ type: "text", text: truncateResponse(lines.join("\n")) }] }
  } catch (error) {
    return formatToolError(error, "watch_keywords")
  }
}
