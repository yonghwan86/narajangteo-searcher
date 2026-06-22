/**
 * search_it_bids — IT 관련 입찰공고 검색
 */

import { z } from "zod"
import type { G2bClient } from "../lib/g2bClient.js"
import type { LooseToolResponse } from "../lib/types.js"
import { formatToolError, notFoundResponse } from "../lib/errors.js"
import { dateTimeSchema } from "../lib/schemas.js"
import { todayRange } from "../lib/dateutil.js"
import { runItSearch } from "../lib/search-engine.js"
import { SPLDMD_LABEL_TO_CODE } from "../lib/keywords.js"
import { formatSearchResults, bidKey } from "../lib/formatters.js"
import { truncateResponse } from "../lib/schemas.js"
import { openReportSafe } from "../lib/reportHelper.js"

export const SearchItBidsSchema = z.object({
  keywords: z.array(z.string()).optional().describe("IT 키워드 목록 (미지정 시 기본 IT 키워드 세트 사용)"),
  startDate: dateTimeSchema.optional().describe("조회시작일시 YYYYMMDDHHMM (기본: 오늘 00:00)"),
  endDate: dateTimeSchema.optional().describe("조회종료일시 YYYYMMDDHHMM (기본: 오늘 23:59)"),
  minBudget: z.number().optional().describe("최소 추정가격(원)"),
  maxBudget: z.number().optional().describe("최대 추정가격(원)"),
  region: z.string().optional().describe("참가제한지역명 일부 (예: '서울')"),
  includeNationwide: z.boolean().optional().default(true).describe("지역 필터 시 전국(지역제한 없음) 공고 포함 여부"),
  deadlineWithinDays: z.number().optional().describe("마감이 N일 이내인 공고만"),
  businessType: z.enum(["전체", "용역", "물품", "공사", "외자", "기타"]).optional().default("용역").describe("업무구분 (IT는 대부분 용역, '전체'는 5개 업무 통합 조회)"),
  jointContractMethod: z.enum(["전체", "공동이행", "분담이행", "공동이행또는분담이행"]).optional().default("전체").describe("공동수급방식 필터 (전체/공동이행(공500001)/분담이행(공500002)/공동이행또는분담이행(공500006))"),
  excludeKeywords: z.array(z.string()).optional().describe("제외 키워드 목록"),
  pageNo: z.number().int().min(1).optional().default(1).describe("페이지 번호"),
  numOfRows: z.number().int().min(1).max(999).optional().default(100).describe("한 페이지 결과 수 (기본 100)"),
  openInBrowser: z.boolean().optional().default(false).describe("결과를 별도 브라우저 창(정렬·필터 가능한 HTML 표)으로 띄울지 여부"),
})

export type SearchItBidsInput = z.infer<typeof SearchItBidsSchema>

export async function searchItBids(client: G2bClient, input: SearchItBidsInput): Promise<LooseToolResponse> {
  try {
    const range = todayRange()
    const bgn = input.startDate ?? range.bgn
    const end = input.endDate ?? range.end

    const spldmdCd = input.jointContractMethod && input.jointContractMethod !== "전체"
      ? SPLDMD_LABEL_TO_CODE[input.jointContractMethod === "공동이행또는분담이행" ? "공동이행 또는 분담이행" : input.jointContractMethod]
      : undefined

    const result = await runItSearch(client, {
      business: input.businessType,
      bgn,
      end,
      keywords: input.keywords,
      excludeKeywords: input.excludeKeywords,
      minBudget: input.minBudget,
      maxBudget: input.maxBudget,
      region: input.region,
      includeNationwide: input.includeNationwide,
      deadlineWithinDays: input.deadlineWithinDays,
      spldmdCd,
    })

    if (result.bids.length === 0) {
      return notFoundResponse(
        `조건에 맞는 IT 공고가 없습니다. (조회기간 ${bgn}~${end}, 업무구분 ${input.businessType}, 서버매칭 ${result.matchedBeforeFilter}건)`,
        [
          "조회 기간(startDate/endDate)을 넓혀보세요.",
          "keywords 를 줄이거나 다른 IT 키워드를 시도하세요.",
          "예산/지역/마감 필터를 완화하세요.",
        ]
      )
    }

    const scores = result.scores
    const sortedBids = result.bids

    const truncNote = result.truncated ? " ⚠️호출한도 도달로 일부 생략" : ""
    const title = `IT 입찰공고 검색 결과 (${input.businessType}, ${bgn.slice(0, 8)}~${end.slice(0, 8)})`
    const md = formatSearchResults(sortedBids, scores, {
      totalCount: result.matchedBeforeFilter,
      title: title + truncNote,
      topN: 10,
    })

    let prefix = ""
    if (input.openInBrowser) {
      const items = sortedBids.slice(0, 500).map((b) => ({ bid: b, score: scores.get(bidKey(b))! }))
      prefix = (await openReportSafe(title, items, "search-it-bids", result.matchedBeforeFilter)) + "\n"
    }

    return { content: [{ type: "text", text: prefix + truncateResponse(md) }] }
  } catch (error) {
    return formatToolError(error, "search_it_bids")
  }
}
