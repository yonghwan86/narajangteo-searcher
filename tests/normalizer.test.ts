import { test } from "node:test"
import assert from "node:assert/strict"
import {
  parseAmount,
  formatDateTime,
  hoursUntil,
  normalizeBidNotice,
  formatMoney,
  UNKNOWN,
} from "../src/lib/normalizer.js"
import dayjs from "dayjs"

test("parseAmount: 콤마/원 제거 후 숫자 변환", () => {
  assert.equal(parseAmount("55,330,000"), 55330000)
  assert.equal(parseAmount("128822000원"), 128822000)
  assert.equal(parseAmount("0"), 0)
})

test("parseAmount: 빈값/비숫자는 undefined", () => {
  assert.equal(parseAmount(undefined), undefined)
  assert.equal(parseAmount(""), undefined)
  assert.equal(parseAmount("공고서에 의함"), undefined)
})

test("formatDateTime: 다양한 형식 → YYYY-MM-DD HH:mm", () => {
  assert.equal(formatDateTime("2025-07-08 10:00:00"), "2025-07-08 10:00")
  assert.equal(formatDateTime("2025-07-07 18:00"), "2025-07-07 18:00")
  assert.equal(formatDateTime("202507010000"), "2025-07-01 00:00")
})

test("formatDateTime: 빈값은 undefined", () => {
  assert.equal(formatDateTime(undefined), undefined)
  assert.equal(formatDateTime(""), undefined)
})

test("hoursUntil: 미래 마감은 양수, 과거는 음수", () => {
  const now = dayjs("2025-07-01 00:00", "YYYY-MM-DD HH:mm")
  const future = hoursUntil("2025-07-02 00:00", now)
  assert.ok(future !== undefined && Math.abs(future - 24) < 0.001)
  const past = hoursUntil("2025-06-30 00:00", now)
  assert.ok(past !== undefined && past < 0)
})

test("normalizeBidNotice: 핵심 필드 매핑 + 결측 처리", () => {
  const raw = {
    bidNtceNo: "R25BK00932003",
    bidNtceOrd: "000",
    bidNtceNm: "AI 기반 업무자동화 시스템 구축 용역",
    ntceInsttNm: "광주광역시교육청",
    dminsttNm: "문성고등학교",
    cntrctCnclsMthdNm: "일반경쟁",
    bidMethdNm: "전자입찰",
    presmptPrce: "55,330,000",
    bidClseDt: "2099-07-08 10:00:00",
    indstrytyLmtYn: "Y",
    bidNtceDtlUrl: "https://www.g2b.go.kr/x",
  }
  const n = normalizeBidNotice(raw)
  assert.equal(n.bidNo, "R25BK00932003")
  assert.equal(n.title, "AI 기반 업무자동화 시스템 구축 용역")
  assert.equal(n.estimatedPrice, 55330000)
  assert.equal(n.itCategory, "AI/인공지능")
  assert.ok(n.qualificationSummary?.includes("업종"))
  assert.equal(n.originalUrl, "https://www.g2b.go.kr/x")
  assert.ok(n.hoursToDeadline !== undefined && n.hoursToDeadline > 0)
})

test("normalizeBidNotice: 결측 필드는 undefined, 제목 없으면 UNKNOWN", () => {
  const n = normalizeBidNotice({})
  assert.equal(n.title, UNKNOWN)
  assert.equal(n.estimatedPrice, undefined)
  assert.equal(n.agencyName, undefined)
})

test("formatMoney: 천단위 콤마 + 원, 결측은 UNKNOWN", () => {
  assert.equal(formatMoney(120000000), "120,000,000원")
  assert.equal(formatMoney(undefined), UNKNOWN)
})
