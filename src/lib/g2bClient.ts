/**
 * 나라장터 입찰공고정보서비스 API 클라이언트
 * - type=json 우선, 키/인증 오류 시 XML 봉투 방어 파싱
 * - resultCode 매핑 (03 No Data → 빈 결과 정상처리)
 * - item 항상 배열 정규화
 * - 동일 요청 캐시 (일 1,000건 트래픽 제한 대응)
 */

import { buildEndpoint, getServiceKeyForQuery, DEFAULT_PROTOCOL, DEFAULT_SERVICE, type ServiceId } from "../config.js"
import { fetchWithRetry, isTlsCertError } from "./fetch-with-retry.js"
import { bidCache } from "./cache.js"
import { G2bApiError, ErrorCodes, errorFromResultCode } from "./errors.js"
import { OPERATION_MAP } from "./operations.js"

// 사내 TLS 가로채기 환경에서 https 인증서 오류 발생 시 http 우선 사용 (세션 단위)
let preferHttp = false

/** 정규화된 API 호출 결과 */
export interface ApiResult {
  resultCode: string
  resultMsg: string
  totalCount: number
  pageNo: number
  numOfRows: number
  items: Record<string, unknown>[]
}

/** 호출 옵션 */
export interface CallOptions {
  /** 캐시 사용 여부 (기본 true) */
  useCache?: boolean
  /** 캐시 TTL(ms, 기본 10분) */
  cacheTtl?: number
}

export class G2bClient {
  /**
   * 오퍼레이션 호출.
   * @param operationName getBidPblancListInfoServc 등
   * @param params 빈 값은 자동 제외됨 (serviceKey/type 은 내부 주입)
   */
  async callOperation(
    operationName: string,
    params: Record<string, string | number | undefined | null>,
    options: CallOptions = {}
  ): Promise<ApiResult> {
    const { useCache = true, cacheTtl = 10 * 60 * 1000 } = options

    // 캐시 키 (serviceKey 제외 — 키로 결과가 분기되지 않음)
    const cacheKey = this.buildCacheKey(operationName, params)
    if (useCache) {
      const cached = bidCache.get<ApiResult>(cacheKey)
      if (cached) return cached
    }

    const response = await this.fetchWithProtocolFallback(operationName, params)

    if (!response.ok) {
      // body 스트림 누수 방지
      try {
        await response.text()
      } catch {
        /* ignore */
      }
      if (response.status === 429) {
        throw new G2bApiError("API 요청 한도를 초과했습니다 (429).", ErrorCodes.RATE_LIMITED, ["잠시 후 다시 시도하세요."])
      }
      throw new G2bApiError(`API HTTP 오류 (${response.status})`, ErrorCodes.API_ERROR)
    }

    const text = await response.text()
    const result = this.parseResponse(text, operationName)

    if (useCache) bidCache.set(cacheKey, result, cacheTtl)
    return result
  }

  /**
   * fetch 호출. HTTPS가 인증서 문제(SELF_SIGNED 등, 사내 보안장비)로 실패하면
   * 자동으로 HTTP로 한 번 재시도하고, 이후 세션은 HTTP를 우선 사용한다.
   */
  private async fetchWithProtocolFallback(
    operationName: string,
    params: Record<string, string | number | undefined | null>
  ): Promise<Response> {
    // 오퍼레이션이 속한 서비스(입찰공고정보/낙찰정보)별로 base 경로를 선택
    const service: ServiceId = OPERATION_MAP.get(operationName)?.service ?? DEFAULT_SERVICE
    const primaryBase = buildEndpoint(preferHttp ? "http" : DEFAULT_PROTOCOL, service)
    try {
      return await fetchWithRetry(this.buildUrl(operationName, params, primaryBase))
    } catch (e) {
      if (isTlsCertError(e) && primaryBase.startsWith("https://")) {
        // 사내 TLS 가로채기 환경 — http 로 폴백하고 이후엔 http 우선
        preferHttp = true
        return await fetchWithRetry(this.buildUrl(operationName, params, buildEndpoint("http", service)))
      }
      throw e
    }
  }

  private buildUrl(
    operationName: string,
    params: Record<string, string | number | undefined | null>,
    base: string = buildEndpoint(DEFAULT_PROTOCOL)
  ): string {
    const search = new URLSearchParams()
    // 키 주입 (이중 인코딩 방지: getServiceKeyForQuery 가 적절한 형태 반환, URLSearchParams 가 1회 인코딩)
    search.set("serviceKey", getServiceKeyForQuery())
    search.set("type", "json")
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue
      const s = String(v).trim()
      if (s === "") continue
      search.set(k, s)
    }
    return `${base}/${operationName}?${search.toString()}`
  }

  private buildCacheKey(operationName: string, params: Record<string, string | number | undefined | null>): string {
    const entries = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
      .map(([k, v]) => `${k}=${String(v).trim()}`)
      .sort()
    return `${operationName}?${entries.join("&")}`
  }

  /**
   * 응답 파싱. type=json 이지만 키/인증 오류 시 XML 봉투가 올 수 있어 방어 처리.
   */
  private parseResponse(text: string, operationName: string): ApiResult {
    const trimmed = text.trim()

    // XML 에러 봉투 감지 (OpenAPI_ServiceResponse / cmmMsgHeader)
    if (trimmed.startsWith("<")) {
      const reasonCode = this.extractXmlTag(trimmed, "returnReasonCode")
      const authMsg = this.extractXmlTag(trimmed, "returnAuthMsg") || this.extractXmlTag(trimmed, "errMsg")
      if (reasonCode) {
        const err = errorFromResultCode(reasonCode, authMsg ?? undefined)
        if (err) throw err
      }
      throw new G2bApiError(
        `API가 비정상(XML) 응답을 반환했습니다.${authMsg ? ` (${authMsg})` : ""}`,
        ErrorCodes.AUTH_ERROR,
        ["인증키 등록·승인 상태와 요청 파라미터를 확인하세요."]
      )
    }

    let json: unknown
    try {
      json = JSON.parse(trimmed)
    } catch {
      throw new G2bApiError(
        `응답 JSON 파싱에 실패했습니다 (오퍼레이션: ${operationName}).`,
        ErrorCodes.PARSE_ERROR,
        ["일시적 장애일 수 있으니 잠시 후 다시 시도하세요."]
      )
    }

    const resp = (json as { response?: Record<string, unknown> }).response
    if (!resp) {
      throw new G2bApiError("응답 형식이 예상과 다릅니다 (response 누락).", ErrorCodes.PARSE_ERROR)
    }

    const header = (resp.header || {}) as { resultCode?: string; resultMsg?: string }
    const resultCode = String(header.resultCode ?? "")
    const resultMsg = String(header.resultMsg ?? "")

    // 00 / 03(No Data) 외에는 에러
    const err = errorFromResultCode(resultCode, resultMsg)
    if (err && resultCode !== "03") throw err

    const body = (resp.body || {}) as {
      items?: unknown
      totalCount?: unknown
      pageNo?: unknown
      numOfRows?: unknown
    }

    return {
      resultCode,
      resultMsg,
      totalCount: this.toInt(body.totalCount),
      pageNo: this.toInt(body.pageNo),
      numOfRows: this.toInt(body.numOfRows),
      items: this.normalizeItems(body.items),
    }
  }

  /** items 를 항상 배열로 정규화 (단건이면 객체, 0건이면 ""/빈객체 등 다양한 형태로 옴) */
  private normalizeItems(items: unknown): Record<string, unknown>[] {
    if (items === undefined || items === null || items === "") return []
    // { item: [...] } 또는 { item: {...} } 형태
    if (typeof items === "object" && !Array.isArray(items)) {
      const inner = (items as { item?: unknown }).item
      if (inner === undefined || inner === null || inner === "") return []
      if (Array.isArray(inner)) return inner as Record<string, unknown>[]
      return [inner as Record<string, unknown>]
    }
    if (Array.isArray(items)) return items as Record<string, unknown>[]
    return []
  }

  private toInt(v: unknown): number {
    const n = parseInt(String(v ?? ""), 10)
    return isNaN(n) ? 0 : n
  }

  private extractXmlTag(xml: string, tag: string): string | null {
    const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
    return m ? m[1].trim() : null
  }
}

/** operationName 유효성 검사 헬퍼 */
export function isValidOperation(name: string): boolean {
  return OPERATION_MAP.has(name)
}
