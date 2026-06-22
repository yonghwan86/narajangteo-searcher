/**
 * get_bid_opening_result — 개찰결과(전체 투찰자 명단) 조회
 *
 * 1순위: 나라장터 스크래핑(openg-scraper) — 투찰자 전원(순위·사업자번호·업체명·대표·투찰금액·투찰률·비고)
 * 폴백: 공식 OpenAPI(낙찰정보서비스) — 개찰 1순위(낙찰예정자)만. 스크래핑 실패 시 사용.
 */

import { z } from "zod"
import type { G2bClient } from "../lib/g2bClient.js"
import type { LooseToolResponse } from "../lib/types.js"
import { formatToolError, notFoundResponse } from "../lib/errors.js"
import { fetchAllBidders } from "../lib/openg-scraper.js"
import { fetchOpeningResult } from "../lib/opening-core.js"
import { formatMoney, display } from "../lib/normalizer.js"
import { truncateResponse } from "../lib/schemas.js"

export const GetBidOpeningResultSchema = z.object({
  bidNo: z.string().min(1).describe("입찰공고번호 (예: 20240516360)"),
  bidOrd: z.string().optional().describe("입찰공고차수 (예: 000). 기본 000"),
  business: z
    .enum(["용역", "물품", "공사", "외자"])
    .default("용역")
    .describe("업무구분 — OpenAPI 폴백 시에만 사용(전체명단 스크래핑엔 불필요)"),
  opengDate: z.string().optional().describe("개찰일 'YYYY-MM-DD' — OpenAPI 폴백 시 보조용(선택)"),
})

export type GetBidOpeningResultInput = z.infer<typeof GetBidOpeningResultSchema>

function display2(v: number | undefined): string {
  return v === undefined ? "확인 필요" : String(v)
}

export async function getBidOpeningResult(
  client: G2bClient,
  input: GetBidOpeningResultInput
): Promise<LooseToolResponse> {
  const bidOrd = input.bidOrd || "000"
  try {
    // 1순위: 전체 투찰자 명단 스크래핑
    let scraped
    try {
      scraped = await fetchAllBidders(input.bidNo, bidOrd)
    } catch {
      scraped = null
    }

    if (scraped && scraped.bidders.length > 0) {
      const lines: string[] = []
      lines.push(`# 개찰결과 (전체 투찰자) — ${display(scraped.bidName)}`)
      lines.push("")
      lines.push(`- 입찰공고번호: ${scraped.bidNo}-${scraped.bidOrd}`)
      if (scraped.opengDateTime) lines.push(`- 개찰일시: ${scraped.opengDateTime}`)
      lines.push(`- 참가업체 수: ${scraped.participantCount}개사 (전원 표시)`)
      lines.push("")
      lines.push("| 순위 | 사업자등록번호 | 업체명 | 대표자명 | 투찰금액 | 투찰률(%) | 비고 | 투찰일시 |")
      lines.push("|---|---|---|---|---|---|---|---|")
      for (const b of scraped.bidders) {
        lines.push(
          `| ${display2(b.rank)} | ${display(b.bizno)} | ${display(b.companyName)} | ${display(b.ceoName)} | ${formatMoney(b.bidAmount)} | ${display(b.bidRate)} | ${display(b.remark)} | ${display(b.bidDateTime)} |`
        )
      }
      lines.push("")
      lines.push("> 출처: 나라장터 통합검색 상세화면(개찰결과). 사전판정 부적격 업체의 투찰금액·투찰률은 미표시될 수 있습니다.")
      return { content: [{ type: "text", text: truncateResponse(lines.join("\n")) }] }
    }

    // 폴백: OpenAPI(낙찰예정자만)
    const result = await fetchOpeningResult(client, input.bidNo, input.business, {
      opengDate: input.opengDate,
      bidOrd,
    })
    if (result.bidders.length === 0) {
      return notFoundResponse(`공고번호 '${input.bidNo}'의 개찰결과를 찾지 못했습니다.`, [
        "아직 개찰 전이거나 투찰만 마감된 상태일 수 있습니다 (개찰 후 결과 등록).",
        "차수(bidOrd, 예: 000)나 개찰일(opengDate)을 지정해 보세요.",
        "협상에 의한 계약은 최종낙찰자 선정 이후에 정보가 공개됩니다.",
      ])
    }

    const lines: string[] = []
    lines.push(`# 개찰결과 (낙찰예정자) — ${display(result.bidName)} (${result.business})`)
    lines.push("")
    lines.push(`- 입찰공고번호: ${result.bidNo}${result.bidOrd ? `-${result.bidOrd}` : ""}`)
    if (result.opengDateTime) lines.push(`- 개찰일시: ${result.opengDateTime}`)
    if (result.participantCount !== undefined) lines.push(`- 참가업체 수: ${result.participantCount}개사`)
    lines.push("")
    lines.push("| 구분 | 사업자등록번호 | 업체명 | 대표자명 | 투찰금액 | 투찰률(%) |")
    lines.push("|---|---|---|---|---|---|")
    for (const b of result.bidders) {
      const label = b.source === "scsbid" ? "최종낙찰자" : "개찰1순위"
      lines.push(
        `| ${label} | ${display(b.bizno)} | ${display(b.companyName)} | ${display(b.ceoName)} | ${formatMoney(b.bidAmount)} | ${display(b.bidRate)} |`
      )
    }
    lines.push("")
    lines.push(`> ⚠️ 전체 명단 조회(나라장터)에 실패해 공식 OpenAPI 결과(낙찰예정자)로 대체했습니다. ${result.note}`)
    return { content: [{ type: "text", text: truncateResponse(lines.join("\n")) }] }
  } catch (error) {
    return formatToolError(error, "get_bid_opening_result")
  }
}
