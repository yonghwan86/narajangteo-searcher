/**
 * MCP 도구 레지스트리 — 7개 도구 등록 및 핸들러 관리
 * 출처: korean-law-mcp의 tool-registry 패턴 차용.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"
import type { G2bClient } from "./lib/g2bClient.js"
import type { McpTool } from "./lib/types.js"
import { formatToolError } from "./lib/errors.js"

import { searchItBids, SearchItBidsSchema } from "./tools/searchItBids.js"
import { getBidDetail, GetBidDetailSchema } from "./tools/getBidDetail.js"
import { getBidOpeningResult, GetBidOpeningResultSchema } from "./tools/getBidOpeningResult.js"
import { recommendBids, RecommendBidsSchema } from "./tools/recommendBids.js"
import { createBidReviewMemo, CreateBidReviewMemoSchema } from "./tools/createBidReviewMemo.js"
import { findDeadlineUrgentBids, FindDeadlineUrgentBidsSchema } from "./tools/findDeadlineUrgentBids.js"
import { watchKeywords, WatchKeywordsSchema } from "./tools/watchKeywords.js"
import { callRawOperation, CallRawOperationSchema } from "./tools/callRawOperation.js"

export const allTools: McpTool[] = [
  {
    name: "search_it_bids",
    description:
      "[IT공고검색] IT 관련 입찰공고를 검색한다. 나라장터 검색조건(PPSSrch)으로 기간/지역/예산 서버필터 + 다중 IT 키워드 클라이언트필터. 기본: 오늘 게시된 용역공고. '오늘 IT 용역 공고 찾아줘' 같은 질문용.",
    schema: SearchItBidsSchema,
    handler: searchItBids,
  },
  {
    name: "get_bid_detail",
    description:
      "[상세조회] 특정 공고번호의 통합 상세정보(목록필드+기초금액+면허제한+참가가능지역+변경이력)를 조회하고 IT 소기업 관점으로 요약. bidNo 필수.",
    schema: GetBidDetailSchema,
    handler: getBidDetail,
  },
  {
    name: "get_bid_opening_result",
    description:
      "[개찰결과] 특정 공고의 투찰 업체 '전원'(순위·사업자등록번호·업체명·대표자명·투찰금액·투찰률·비고·투찰일시)을 나라장터에서 조회. 마감·개찰 완료된 공고용. bidNo 필수(차수 bidOrd 기본 000). 실패 시 공식 OpenAPI(낙찰예정자)로 자동 폴백.",
    schema: GetBidOpeningResultSchema,
    handler: getBidOpeningResult,
  },
  {
    name: "recommend_bids_for_small_it_company",
    description:
      "[맞춤추천] IT 소기업 기준으로 참여 가능성 높은 공고를 100점 적합도 점수로 추천하고 '바로 검토/조건 확인 후 검토/비추천'으로 분류. companyProfile(역량·예산·인증)로 개인화.",
    schema: RecommendBidsSchema,
    handler: recommendBids,
  },
  {
    name: "create_bid_review_memo",
    description:
      "[검토메모] 특정 공고에 대해 대표가 바로 판단할 수 있는 9개 섹션 입찰 검토 메모(개요~대표 의사결정)를 한국어로 작성. bidNo 필수.",
    schema: CreateBidReviewMemoSchema,
    handler: createBidReviewMemo,
  },
  {
    name: "find_deadline_urgent_bids",
    description:
      "[마감임박] 마감이 N시간 이내(기본 72h)인 IT 공고를 남은 시간 가까운 순으로 정리. 급히 확인할 조건 포함.",
    schema: FindDeadlineUrgentBidsSchema,
    handler: findDeadlineUrgentBids,
  },
  {
    name: "watch_keywords",
    description:
      "[키워드감시] 지정 키워드별로 최근 N일 공고를 검색하고 신규/중복을 표시. 여러 키워드를 한 번에 모니터링.",
    schema: WatchKeywordsSchema,
    handler: watchKeywords,
  },
  {
    name: "call_raw_operation",
    description:
      "[원시호출] 나라장터 입찰공고정보서비스 + 낙찰정보서비스 33개 오퍼레이션을 직접 호출(검증/확장/디버깅). operationName + params. 정제 없이 원본 items 를 반환.",
    schema: CallRawOperationSchema,
    handler: callRawOperation,
  },
]

const toolMap = new Map<string, McpTool>(allTools.map((t) => [t.name, t]))

/**
 * Zod 스키마 → MCP 광고용 JSON Schema 변환
 * Zod v4: z.toJSONSchema({io:"input"}) — .default() 필드가 required로 직렬화되지 않도록 input 모드 사용.
 */
export function toMcpInputSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zAny = z as any
  if (typeof zAny.toJSONSchema === "function") {
    return zAny.toJSONSchema(schema, { io: "input" })
  }
  // 폴백 (Zod v3): 최소한의 object 스키마
  return { type: "object", properties: {}, additionalProperties: true }
}

export const TOOL_COUNT = allTools.length

export function registerTools(server: Server, client: G2bClient): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: toMcpInputSchema(tool.schema),
    })),
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const tool = toolMap.get(name)
    if (!tool) {
      return { content: [{ type: "text" as const, text: `알 수 없는 도구: ${name}` }], isError: true }
    }
    try {
      const input = tool.schema.parse(args ?? {})
      const result = await tool.handler(client, input)
      return {
        content: result.content.map((c) => ({ type: "text" as const, text: c.text })),
        isError: result.isError,
      }
    } catch (error) {
      const errResult = formatToolError(error, name)
      return {
        content: errResult.content.map((c) => ({ type: "text" as const, text: c.text })),
        isError: true,
      }
    }
  })
}
