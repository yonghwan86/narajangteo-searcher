/**
 * 재시도/타임아웃 내장 fetch
 * - 429/503/504 지수 백오프 + jitter
 * - AbortController 타임아웃
 * - 인증키 마스킹
 * 출처: korean-law-mcp의 fetchWithRetry 패턴 차용 (data.go.kr 용으로 수정).
 */

/**
 * URL/메시지에서 민감 정보(인증키) 마스킹 — 에러 메시지/로그 노출 방지.
 * data.go.kr은 ?serviceKey=KEY 쿼리 파라미터로 키를 받으므로 해당 값을 *** 처리.
 */
export function maskSensitiveUrl(text: string): string {
  if (!text) return text
  return text.replace(
    /([?&](?:serviceKey|ServiceKey|servicekey|apikey|apiKey|api_key|authKey|auth_key|key)=)[^&\s]+/g,
    "$1***"
  )
}

export interface FetchWithRetryOptions extends RequestInit {
  /** 요청 타임아웃(ms, 기본 30000) */
  timeout?: number
  /** 최대 재시도 횟수(기본 3) */
  retries?: number
  /** 지수 백오프 기본 지연(ms, 기본 1000) */
  retryDelay?: number
  /** 재시도 대상 HTTP 상태 코드(기본 [429, 503, 504]) */
  retryOn?: number[]
}

const DEFAULT_TIMEOUT = 30000
const DEFAULT_RETRIES = 3
const DEFAULT_RETRY_DELAY = 1000
const DEFAULT_RETRY_ON = [429, 503, 504]

/** TLS/인증서 관련 에러 코드 (재시도 무의미 — 즉시 throw 해서 상위에서 http 폴백) */
const TLS_ERROR_CODES = new Set([
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "CERT_HAS_EXPIRED",
  "ERR_TLS_CERT_ALTNAME_INVALID",
])

/** 에러가 TLS/인증서 문제인지 판별 (error.cause.code 또는 메시지) */
export function isTlsCertError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const code = (error as { cause?: { code?: string } }).cause?.code
  if (code && TLS_ERROR_CODES.has(code)) return true
  return /self.?signed|cert|tls/i.test(error.message) && /cert|signed/i.test(error.message)
}

/**
 * 200으로 빈 본문/HTML(점검·과부하 페이지)을 반환하는 간헐 장애 감지.
 * 정상 응답은 JSON(`{`/`[`) 또는 XML(`<`)로 시작한다.
 */
function detectBadBody(text: string): "empty" | "html" | null {
  const t = text.trim()
  if (!t) return "empty"
  if (/^<!doctype html/i.test(t) || /^<html[\s>]/i.test(t)) return "html"
  return null
}

// 일부 공공 API가 Node 기본 UA(undici)를 봇으로 분류하는 경우가 있어 일반 브라우저 UA로 호출.
const DEFAULT_USER_AGENT =
  process.env.G2B_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    retryOn = DEFAULT_RETRY_ON,
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const headers = new Headers(fetchOptions.headers)
    if (!headers.has("user-agent")) headers.set("user-agent", DEFAULT_USER_AGENT)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok || !retryOn.includes(response.status)) {
        // 200인데 빈 본문/HTML(점검·과부하 페이지)이면 일시 장애로 보고 재시도.
        if (response.ok && attempt < retries) {
          let bodyText: string | null = null
          try {
            bodyText = await response.clone().text()
          } catch {
            /* clone 실패 시 정상 처리 */
          }
          if (bodyText !== null) {
            const bad = detectBadBody(bodyText)
            if (bad) {
              lastError = new Error(
                `비정상 응답(${bad === "empty" ? "빈 본문" : "HTML 페이지"}) - ${maskSensitiveUrl(url)}`
              )
              await sleep(getRetryDelay(response, retryDelay, attempt))
              continue
            }
          }
        }
        return response
      }

      if (attempt < retries) {
        await sleep(getRetryDelay(response, retryDelay, attempt))
        continue
      }
      return response
    } catch (error) {
      clearTimeout(timeoutId)

      // TLS/인증서 에러는 재시도해도 동일 — 즉시 throw (상위에서 http 폴백)
      if (isTlsCertError(error)) {
        throw error
      }

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          lastError = new Error(`요청 시간 초과(${timeout}ms) - ${maskSensitiveUrl(url)}`)
        } else {
          const masked = maskSensitiveUrl(error.message)
          lastError = masked !== error.message ? new Error(masked) : error
        }
      }

      if (attempt < retries) {
        await sleep(getRetryDelay(null, retryDelay, attempt))
        continue
      }
    }
  }

  throw lastError || new Error("재시도 후에도 요청에 실패했습니다.")
}

/** Retry-After 헤더 우선, 없으면 지수 백오프 + jitter */
function getRetryDelay(response: Response | null, retryDelay: number, attempt: number): number {
  if (response) {
    const retryAfter = response.headers.get("Retry-After")
    if (retryAfter) {
      const seconds = Number(retryAfter)
      if (!isNaN(seconds) && seconds > 0) return seconds * 1000
    }
  }
  const baseDelay = retryDelay * Math.pow(2, attempt)
  return baseDelay + Math.random() * baseDelay * 0.5
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
