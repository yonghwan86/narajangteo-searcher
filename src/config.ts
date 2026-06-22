/**
 * 환경설정 및 인증키 관리
 * - 인증키는 코드에 하드코딩하지 않고 환경변수로 주입한다.
 * - 키는 로그/응답에 절대 출력하지 않는다.
 * - Encoding/Decoding 키를 모두 처리하며 ServiceKey 파라미터의 이중 인코딩을 방지한다.
 */

import { G2bApiError, ErrorCodes } from "./lib/errors.js"

/** data.go.kr 나라장터 OpenAPI 엔드포인트 호스트 */
export const ENDPOINT_HOST = "apis.data.go.kr"

/**
 * 서비스 식별자 → API 경로.
 *  - bid    : 입찰공고정보서비스(BidPublicInfoService, 데이터번호 15129394) — 공고/기초금액/면허/지역
 *  - scsbid : 낙찰정보서비스(ScsbidInfoService, 데이터번호 15129397) — 개찰결과/낙찰자(사업자번호·업체명)
 * 두 서비스는 같은 인증키를 쓰지만 data.go.kr 에서 각각 활용신청이 필요하다.
 */
export type ServiceId = "bid" | "scsbid"

export const SERVICE_PATHS: Record<ServiceId, string> = {
  bid: "/1230000/ad/BidPublicInfoService",
  scsbid: "/1230000/as/ScsbidInfoService",
}

export const DEFAULT_SERVICE: ServiceId = "bid"

/** 하위호환용 — 입찰공고정보서비스(bid) 경로 */
export const ENDPOINT_PATH = SERVICE_PATHS[DEFAULT_SERVICE]

/** 환경변수 G2B_API_PROTOCOL 기준 기본 프로토콜 (기본 https) */
export const DEFAULT_PROTOCOL: "http" | "https" =
  (process.env.G2B_API_PROTOCOL || "https").toLowerCase() === "http" ? "http" : "https"

/** 프로토콜·서비스를 지정해 base endpoint 생성 (service 미지정 시 입찰공고정보서비스) */
export function buildEndpoint(protocol: "http" | "https", service: ServiceId = DEFAULT_SERVICE): string {
  return `${protocol}://${ENDPOINT_HOST}${SERVICE_PATHS[service]}`
}

/** 환경변수 G2B_API_PROTOCOL 기준 기본 endpoint (입찰공고정보서비스, 하위호환) */
export const BASE_ENDPOINT = buildEndpoint(DEFAULT_PROTOCOL)

/**
 * 환경변수에서 원본 인증키를 읽는다. 없으면 한국어 오류를 던진다.
 */
export function getRawServiceKey(): string {
  const key = process.env.NARAJANGTEO_SERVICE_KEY || ""
  if (!key || key.trim() === "" || key.includes("여기에")) {
    throw new G2bApiError(
      "인증키가 설정되지 않았습니다. 환경변수 NARAJANGTEO_SERVICE_KEY 에 공공데이터포털 인증키를 입력하세요.",
      ErrorCodes.NO_API_KEY,
      [
        "공공데이터포털(https://www.data.go.kr/data/15129394/openapi.do)에서 활용신청 후 인증키를 발급받으세요.",
        ".env 파일 또는 MCP 클라이언트 설정의 env 에 NARAJANGTEO_SERVICE_KEY 를 추가하세요.",
      ]
    )
  }
  return key.trim()
}

/**
 * 인증키가 이미 URL 인코딩(Encoding 키)된 상태인지 판별한다.
 * - NARAJANGTEO_SERVICE_KEY_IS_ENCODED 가 명시되면 그 값을 사용
 * - 미지정 시 키에 '%'가 포함되어 있으면 Encoding 으로 간주
 */
function isKeyEncoded(rawKey: string): boolean {
  const flag = process.env.NARAJANGTEO_SERVICE_KEY_IS_ENCODED
  if (flag !== undefined && flag.trim() !== "") {
    return flag.trim().toLowerCase() === "true"
  }
  // 단순 '%' 포함이 아니라 유효한 %XX 시퀀스가 있어야 Encoding 으로 간주 (오판별 방지)
  return /%[0-9A-Fa-f]{2}/.test(rawKey)
}

/**
 * URLSearchParams 에 안전하게 넣을 수 있는 형태의 serviceKey 를 반환한다.
 * - Encoding 키: 이미 인코딩되어 있으므로 한 번 디코딩해서 반환
 *   (URLSearchParams.toString() 이 다시 인코딩하므로 이중 인코딩 방지)
 * - Decoding 키: 원본 그대로 반환 (URLSearchParams 가 1회 인코딩)
 *
 * 결과적으로 최종 URL 에서 serviceKey 는 정확히 1회만 인코딩된다.
 */
export function getServiceKeyForQuery(): string {
  const raw = getRawServiceKey()
  if (isKeyEncoded(raw)) {
    try {
      return decodeURIComponent(raw)
    } catch {
      // 디코딩 실패 시 원본 사용 (잘못된 % 시퀀스 등)
      return raw
    }
  }
  return raw
}
