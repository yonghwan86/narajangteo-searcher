/**
 * 날짜 범위 헬퍼 — data.go.kr inqryBgnDt/inqryEndDt (YYYYMMDDHHMM) 생성
 */

import dayjs from "dayjs"

/** 오늘 00:00 ~ 23:59 범위 */
export function todayRange(): { bgn: string; end: string } {
  const now = dayjs()
  return {
    bgn: now.startOf("day").format("YYYYMMDDHHmm"),
    end: now.endOf("day").format("YYYYMMDDHHmm"),
  }
}

/** 최근 N일 (N일 전 00:00 ~ 지금) 범위 */
export function recentDaysRange(days: number): { bgn: string; end: string } {
  const now = dayjs()
  return {
    bgn: now.subtract(days, "day").startOf("day").format("YYYYMMDDHHmm"),
    end: now.format("YYYYMMDDHHmm"),
  }
}

/** 향후 N시간 마감 대상 검색용: 지금 ~ N시간 후 (개찰/마감 기준이 아닌 공고게시 기준이라 넓게 최근 14일) */
export function deadlineSearchRange(): { bgn: string; end: string } {
  // 마감 임박 공고를 찾으려면 최근 게시된 공고를 넓게 받아 마감일로 필터해야 한다.
  return recentDaysRange(21)
}
