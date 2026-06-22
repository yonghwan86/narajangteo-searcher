import { test } from "node:test"
import assert from "node:assert/strict"
import { calculateBidFitScore } from "../src/lib/scoring.js"
import type { BidNotice } from "../src/lib/types.js"
import dayjs from "dayjs"

function makeBid(overrides: Partial<BidNotice> = {}): BidNotice {
  return {
    bidNo: "R25BK00000001",
    title: "AI 기반 데이터 분석 시스템 구축 용역",
    itCategory: "AI/인공지능",
    estimatedPrice: 100_000_000,
    closeDateTime: dayjs().add(7, "day").format("YYYY-MM-DD HH:mm"),
    hoursToDeadline: 7 * 24,
    regionLimit: undefined,
    raw: {},
    ...overrides,
  }
}

test("적합한 IT 공고는 높은 점수 + '바로 검토'", () => {
  const score = calculateBidFitScore(makeBid())
  assert.ok(score.total >= 70, `점수 ${score.total} 이 70 이상이어야 함`)
  assert.equal(score.decision, "바로 검토")
  assert.ok(score.total <= 100)
})

test("비IT 공고는 categoryFit 낮음", () => {
  const score = calculateBidFitScore(makeBid({ title: "교내 화장실 청소 용역", itCategory: "비IT" }))
  assert.ok(score.categoryFit < 18)
})

test("예산이 선호 범위 내면 budgetFit 만점(20)", () => {
  const score = calculateBidFitScore(makeBid({ estimatedPrice: 100_000_000 }), {
    preferredBudgetMin: 10_000_000,
    preferredBudgetMax: 200_000_000,
  })
  assert.equal(score.budgetFit, 20)
})

test("예산이 상한을 크게 초과하면 budgetFit 낮음 + 리스크", () => {
  const score = calculateBidFitScore(makeBid({ estimatedPrice: 5_000_000_000 }), {
    preferredBudgetMax: 200_000_000,
  })
  assert.ok(score.budgetFit <= 8)
  assert.ok(score.risks.some((r) => r.includes("초과")))
})

test("이미 마감된 공고는 deadlineFit 0 + 비추천", () => {
  const score = calculateBidFitScore(makeBid({ hoursToDeadline: -5 }))
  assert.equal(score.deadlineFit, 0)
  assert.equal(score.decision, "비추천")
})

test("지역 제한이 회사 지역과 불일치하면 비추천", () => {
  const score = calculateBidFitScore(makeBid({ regionLimit: "부산광역시" }), { regions: ["서울특별시"] })
  assert.equal(score.decision, "비추천")
})

test("총점은 각 항목 합과 일치(0~100 clamp)", () => {
  const s = calculateBidFitScore(makeBid())
  const sum = s.categoryFit + s.budgetFit + s.deadlineFit + s.regionFit + s.smallBusinessFit + s.competitionFit
  assert.equal(s.total, Math.min(100, sum))
})
