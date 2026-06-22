/**
 * 공통 Zod 스키마 및 응답 크기 제한
 */

import { z } from "zod"

/** 날짜시각 스키마 (YYYYMMDDHHMM, 12자리) — data.go.kr inqryBgnDt/inqryEndDt 형식 */
export const dateTimeSchema = z
  .string()
  .regex(/^\d{12}$/, "날짜시각 형식: YYYYMMDDHHMM (12자리, 예: 202507010000)")
  .refine((val) => {
    const year = parseInt(val.slice(0, 4), 10)
    const month = parseInt(val.slice(4, 6), 10)
    const day = parseInt(val.slice(6, 8), 10)
    const hour = parseInt(val.slice(8, 10), 10)
    const minute = parseInt(val.slice(10, 12), 10)
    if (year < 2000 || year > 2100) return false
    if (month < 1 || month > 12) return false
    if (day < 1 || day > 31) return false
    if (hour > 23) return false
    if (minute > 59) return false
    return true
  }, { message: "유효하지 않은 날짜시각입니다." })

/** 페이지네이션 공통 스키마 */
export const numOfRowsSchema = z.number().int().min(1).max(999).default(100).describe("한 페이지 결과 수 (기본 100, 최대 999)")
export const pageNoSchema = z.number().int().min(1).default(1).describe("페이지 번호 (기본 1)")

/** 응답 크기 제한 (60KB) — 공고당 100여 필드라 응답이 커질 수 있음 */
export const MAX_RESPONSE_SIZE = 60000

export function truncateResponse(text: string, maxSize: number = MAX_RESPONSE_SIZE): string {
  if (text.length <= maxSize) return text
  return text.slice(0, maxSize) + `\n\n⚠️ 응답이 너무 길어 ${maxSize.toLocaleString()}자로 잘렸습니다.`
}
