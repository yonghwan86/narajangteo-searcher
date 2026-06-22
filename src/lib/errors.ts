/**
 * 통일된 에러 처리 모듈 (전부 한국어)
 * 출처: korean-law-mcp의 errors.ts 패턴 차용 + data.go.kr 에러코드 매핑.
 */

import type { ToolResponse } from "./types.js"
import { maskSensitiveUrl } from "./fetch-with-retry.js"

export const ErrorCodes = {
  NO_API_KEY: "NO_API_KEY",
  INVALID_PARAM: "INVALID_PARAMETER",
  API_ERROR: "EXTERNAL_API_ERROR",
  AUTH_ERROR: "AUTH_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  TIMEOUT: "REQUEST_TIMEOUT",
  PARSE_ERROR: "PARSE_ERROR",
  NOT_FOUND: "NOT_FOUND",
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

/**
 * data.go.kr OpenAPI 결과코드 → 사람이 읽을 메시지 + 조치방안
 * (참고문서 "OPEN API 에러코드별 조치방안" 표 기준)
 */
const RESULT_CODE_MAP: Record<string, { code: ErrorCode; message: string; suggestions: string[] }> = {
  "01": { code: ErrorCodes.API_ERROR, message: "제공기관 서비스 상태가 원활하지 않습니다 (Application Error).", suggestions: ["잠시 후 다시 시도하세요."] },
  "02": { code: ErrorCodes.API_ERROR, message: "제공기관 DB 오류입니다 (DB Error).", suggestions: ["잠시 후 다시 시도하세요."] },
  "03": { code: ErrorCodes.NOT_FOUND, message: "조회 결과가 없습니다 (No Data).", suggestions: ["검색 조건(기간/공고번호)을 넓혀 다시 시도하세요."] },
  "04": { code: ErrorCodes.API_ERROR, message: "HTTP 오류입니다.", suggestions: ["잠시 후 다시 시도하세요."] },
  "05": { code: ErrorCodes.TIMEOUT, message: "서비스 응답 시간이 초과되었습니다.", suggestions: ["잠시 후 다시 시도하세요."] },
  "06": { code: ErrorCodes.INVALID_PARAM, message: "날짜 형식 오류입니다.", suggestions: ["날짜는 YYYYMMDDHHMM (12자리) 형식이어야 합니다."] },
  "07": { code: ErrorCodes.INVALID_PARAM, message: "입력 범위값을 초과했습니다.", suggestions: ["파라미터 입력값 범위를 확인하세요."] },
  "08": { code: ErrorCodes.INVALID_PARAM, message: "필수값 입력 오류입니다.", suggestions: ["필수 파라미터가 누락되지 않았는지 확인하세요."] },
  "10": { code: ErrorCodes.INVALID_PARAM, message: "잘못된 요청 파라미터입니다 (ServiceKey 누락 등).", suggestions: ["인증키 및 요청 파라미터를 확인하세요."] },
  "11": { code: ErrorCodes.INVALID_PARAM, message: "필수 요청 파라미터가 없습니다.", suggestions: ["기술문서의 필수 파라미터를 확인하세요."] },
  "12": { code: ErrorCodes.API_ERROR, message: "해당 오픈API 서비스가 없거나 폐기되었습니다.", suggestions: ["요청 URL과 오퍼레이션명을 확인하세요."] },
  "20": { code: ErrorCodes.AUTH_ERROR, message: "서비스 접근이 거부되었습니다 (활용승인 안됨).", suggestions: ["공공데이터포털에서 활용신청 승인 상태를 확인하세요."] },
  "22": { code: ErrorCodes.RATE_LIMITED, message: "서비스 요청 제한 횟수를 초과했습니다 (일일 트래픽 초과).", suggestions: ["개발계정은 일 1,000건 제한입니다. 잠시 후 다시 시도하거나 운영계정으로 트래픽을 늘리세요."] },
  "30": { code: ErrorCodes.AUTH_ERROR, message: "등록되지 않은 서비스 키입니다.", suggestions: ["발급받은 인증키가 정확한지 확인하세요.", "Decoding 키를 넣었다면 NARAJANGTEO_SERVICE_KEY_IS_ENCODED=false 로 설정하세요."] },
  "31": { code: ErrorCodes.AUTH_ERROR, message: "기한이 만료된 서비스 키입니다.", suggestions: ["공공데이터포털에서 활용연장신청 후 사용하세요."] },
  "32": { code: ErrorCodes.AUTH_ERROR, message: "등록되지 않은 도메인명 또는 IP 주소입니다.", suggestions: ["활용신청 정보의 등록 IP/도메인을 확인하세요."] },
}

/** data.go.kr 결과코드용 에러 — resultCode를 보존 */
export class G2bApiError extends Error {
  code: ErrorCode
  resultCode?: string
  suggestions: string[]

  constructor(message: string, code: ErrorCode, suggestions: string[] = [], resultCode?: string) {
    super(message)
    this.name = "G2bApiError"
    this.code = code
    this.resultCode = resultCode
    this.suggestions = suggestions
  }
}

/** resultCode 값으로 G2bApiError 생성 ("00"이면 null 반환) */
export function errorFromResultCode(resultCode: string, resultMsg?: string): G2bApiError | null {
  if (resultCode === "00") return null
  const mapped = RESULT_CODE_MAP[resultCode]
  if (mapped) {
    const msg = resultMsg && resultMsg !== mapped.message ? `${mapped.message} (API 메시지: ${resultMsg})` : mapped.message
    return new G2bApiError(msg, mapped.code, mapped.suggestions, resultCode)
  }
  return new G2bApiError(
    `API 오류 (resultCode=${resultCode}${resultMsg ? `, ${resultMsg}` : ""})`,
    ErrorCodes.API_ERROR,
    ["기술문서를 확인하거나 잠시 후 다시 시도하세요."],
    resultCode
  )
}

/**
 * 명시적 "데이터 없음" 응답 (환각 방지)
 * LLM이 결과를 지어내지 않도록 [NOT_FOUND] 프리픽스를 사용한다.
 */
export function notFoundResponse(message: string, suggestions?: string[]): ToolResponse {
  const lines = [`[NOT_FOUND] ${message}`]
  lines.push("")
  lines.push("⚠️ 이 도구는 실제 데이터를 찾지 못했습니다. 결과를 추측하거나 지어내지 말고, 사용자에게 '검색 결과 없음'을 명시하세요.")
  if (suggestions && suggestions.length > 0) {
    lines.push("")
    lines.push("재시도 제안:")
    suggestions.forEach((s) => lines.push(`  - ${s}`))
  }
  return { content: [{ type: "text", text: lines.join("\n") }], isError: true }
}

/** 도구 에러 응답 생성 — 구조화된 한국어 포맷 (인증키 마스킹 최종 방어선) */
export function formatToolError(error: unknown, context?: string): ToolResponse {
  let code: string
  let msg: string
  let suggestions: string[]

  if (error instanceof G2bApiError) {
    code = error.code
    msg = error.message
    suggestions = error.suggestions
  } else if (error instanceof Error) {
    // Zod 검증 에러
    if (error.name === "ZodError" && Array.isArray((error as unknown as { issues?: unknown[] }).issues)) {
      code = ErrorCodes.INVALID_PARAM
      msg = (error as unknown as { issues: Array<{ path: (string | number)[]; message: string }> }).issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")
      suggestions = ["파라미터 형식과 필수 값을 확인하세요."]
    } else {
      code = ErrorCodes.API_ERROR
      msg = error.message
      suggestions = []
    }
  } else {
    code = ErrorCodes.API_ERROR
    msg = String(error)
    suggestions = []
  }

  const lines: string[] = []
  lines.push(`❌ [${code}] ${maskSensitiveUrl(msg)}`)
  if (context) lines.push(`🔧 도구: ${context}`)
  if (suggestions.length > 0) {
    lines.push("💡 제안:")
    suggestions.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`))
  }

  return { content: [{ type: "text", text: lines.join("\n") }], isError: true }
}
