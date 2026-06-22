/**
 * MCP 도구 및 입찰공고 데이터 타입 정의
 */

import { z } from "zod"
import type { G2bClient } from "./g2bClient.js"

/** MCP 도구 응답 타입 */
export interface ToolResponse {
  content: Array<{ type: "text"; text: string }>
  isError?: boolean
}

/** 도구 핸들러가 반환할 수 있는 느슨한 타입 */
export interface LooseToolResponse {
  content: Array<{ type: string; text: string }>
  isError?: boolean
}

/** MCP 도구 정의 인터페이스 */
export interface McpTool {
  /** 도구 이름 (snake_case) */
  name: string
  /** 도구 설명 */
  description: string
  /** Zod 입력 스키마 */
  schema: z.ZodTypeAny
  /** 도구 핸들러 함수 (input 타입은 Zod 런타임 검증으로 보장) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (client: G2bClient, input: any) => Promise<LooseToolResponse>
}

/**
 * 정규화된 입찰공고 (raw API 응답 → 표준 타입)
 */
export interface BidNotice {
  bidNo: string
  bidOrd?: string
  title: string
  agencyName?: string
  demandOrgName?: string
  businessType?: string
  contractMethod?: string
  bidMethod?: string
  noticeDateTime?: string
  closeDateTime?: string
  openDateTime?: string
  estimatedPrice?: number
  baseAmount?: number
  regionLimit?: string
  qualificationSummary?: string
  /** 공동수급방식코드 (공500001 공동이행, 공500002 분담이행, 공500006 공동이행또는분담이행 등) */
  spldmdCd?: string
  /** 공동수급방식명 (예: "(전자)분담이행", "공동수급불허") */
  spldmdNm?: string
  originalUrl?: string
  /** IT 카테고리 분류 결과 (keywords.ts) */
  itCategory?: string
  /** 마감까지 남은 시간(시간 단위). 계산 불가 시 undefined */
  hoursToDeadline?: number
  raw: unknown
}

/** 회사 프로필 (추천 점수 계산 입력) */
export interface CompanyProfile {
  regions?: string[]
  capabilities?: string[]
  preferredBudgetMin?: number
  preferredBudgetMax?: number
  hasSoftwareBusinessRegistration?: boolean
  hasDirectProductionCertificate?: boolean
  hasSmallBusinessConfirmation?: boolean
  hasVentureCertification?: boolean
  hasWomenEnterpriseCertification?: boolean
  hasDisabilityEnterpriseCertification?: boolean
}

/** 추천 점수 결과 */
export interface BidScore {
  total: number
  categoryFit: number
  budgetFit: number
  deadlineFit: number
  regionFit: number
  smallBusinessFit: number
  competitionFit: number
  reasons: string[]
  risks: string[]
  decision: "바로 검토" | "조건 확인 후 검토" | "비추천"
}
