/**
 * IT 소기업 입찰 적합도 점수 계산
 *
 * 100점 만점:
 *  - categoryFit      30 (IT 키워드/카테고리 적합도)
 *  - budgetFit        20 (예산 규모 적합도)
 *  - deadlineFit      15 (마감 여유도)
 *  - regionFit        10 (지역 제한 적합도)
 *  - smallBusinessFit 15 (소기업 참여 가능성)
 *  - competitionFit   10 (경쟁 과열 가능성 낮음 — 휴리스틱 추정)
 *
 * ⚠️ "경쟁 과열/대기업 제한" 항목은 API 직접 필드가 없어 휴리스틱으로 추정한다.
 */

import type { BidNotice, BidScore, CompanyProfile } from "./types.js"

export const DEFAULT_COMPANY_PROFILE: Required<Pick<CompanyProfile, "capabilities" | "preferredBudgetMin" | "preferredBudgetMax">> = {
  capabilities: ["웹 개발", "시스템 구축", "유지보수", "데이터 분석", "AI", "업무자동화"],
  preferredBudgetMin: 10_000_000,
  preferredBudgetMax: 200_000_000,
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

/** capability 키워드 ↔ 공고명 매칭 점수(0~1) */
function capabilityMatchRatio(title: string, capabilities: string[]): number {
  if (!title || capabilities.length === 0) return 0
  const lower = title.toLowerCase()
  // capability 를 토큰 단위로 쪼개 부분 매칭 (예: "웹 개발" → "웹", "개발")
  let hits = 0
  for (const cap of capabilities) {
    const tokens = cap.split(/\s+/).filter(Boolean)
    if (tokens.some((t) => lower.includes(t.toLowerCase()))) hits++
  }
  return clamp(hits / capabilities.length, 0, 1)
}

export function calculateBidFitScore(bid: BidNotice, profile: CompanyProfile = {}): BidScore {
  const reasons: string[] = []
  const risks: string[] = []

  const capabilities = profile.capabilities ?? DEFAULT_COMPANY_PROFILE.capabilities
  const budgetMin = profile.preferredBudgetMin ?? DEFAULT_COMPANY_PROFILE.preferredBudgetMin
  const budgetMax = profile.preferredBudgetMax ?? DEFAULT_COMPANY_PROFILE.preferredBudgetMax

  // 1) categoryFit (30) — IT 카테고리 + capability 적합도
  let categoryFit = 0
  const isIt = bid.itCategory && bid.itCategory !== "비IT"
  if (isIt) {
    categoryFit += 18
    reasons.push(`IT 카테고리: ${bid.itCategory}`)
  } else {
    risks.push("IT 분야 적합성이 낮을 수 있음(키워드 매칭 약함)")
  }
  const capRatio = capabilityMatchRatio(bid.title, capabilities)
  categoryFit += Math.round(capRatio * 12)
  if (capRatio > 0) reasons.push(`보유 역량과 ${Math.round(capRatio * 100)}% 매칭`)
  categoryFit = clamp(categoryFit, 0, 30)

  // 2) budgetFit (20) — 추정가격이 선호 예산 범위에 들수록 높음
  let budgetFit = 0
  const price = bid.estimatedPrice ?? bid.baseAmount
  if (price === undefined) {
    budgetFit = 8 // 정보 없음 — 중립
    risks.push("예산(추정가격) 정보가 없어 적합도 추정 제한적")
  } else if (price >= budgetMin && price <= budgetMax) {
    budgetFit = 20
    reasons.push(`예산 ${price.toLocaleString("ko-KR")}원이 선호 범위 내`)
  } else if (price < budgetMin) {
    // 너무 작음 — 어느 정도 감점
    budgetFit = 12
    risks.push(`예산 ${price.toLocaleString("ko-KR")}원이 선호 하한(${budgetMin.toLocaleString("ko-KR")}원)보다 작음`)
  } else {
    // 너무 큼 — 소기업 단독 수행 부담
    const over = price / budgetMax
    budgetFit = over > 3 ? 2 : 8
    risks.push(`예산 ${price.toLocaleString("ko-KR")}원이 선호 상한(${budgetMax.toLocaleString("ko-KR")}원) 초과 — 소기업 단독 수행 부담`)
  }

  // 3) deadlineFit (15) — 마감 여유
  let deadlineFit = 0
  const h = bid.hoursToDeadline
  if (h === undefined) {
    deadlineFit = 7
    risks.push("마감일시 정보가 없어 일정 판단 제한적")
  } else if (h < 0) {
    deadlineFit = 0
    risks.push("이미 마감된 공고로 보임")
  } else if (h < 24) {
    deadlineFit = 4
    risks.push("마감이 24시간 이내 — 준비 시간 매우 촉박")
  } else if (h < 72) {
    deadlineFit = 9
    reasons.push("마감 3일 이내 — 신속 검토 필요")
  } else if (h <= 24 * 14) {
    deadlineFit = 15
    reasons.push("마감까지 충분한 준비 기간")
  } else {
    deadlineFit = 12
  }

  // 4) regionFit (10) — 지역 제한이 회사 지역과 맞는지 (정보 없으면 전국으로 간주, 중립~우호)
  let regionFit = 0
  const regionLimit = bid.regionLimit
  const myRegions = profile.regions ?? []
  if (!regionLimit || /전국|제한없음|없음/.test(regionLimit)) {
    regionFit = 10
    reasons.push("지역 제한 없음(전국 참여 가능)")
  } else if (myRegions.length === 0) {
    regionFit = 6 // 회사 지역 미지정 — 중립
  } else if (myRegions.some((r) => regionLimit.includes(r) || r.includes(regionLimit))) {
    regionFit = 10
    reasons.push(`참가제한지역(${regionLimit})에 회사 소재지 포함`)
  } else {
    regionFit = 1
    risks.push(`지역 제한(${regionLimit})이 회사 소재지와 불일치 — 참여 불가 가능`)
  }

  // 5) smallBusinessFit (15) — 소기업 참여 가능성 (인증/제한 기반 휴리스틱)
  let smallBusinessFit = 8 // 기본 중립
  if (profile.hasSmallBusinessConfirmation) {
    smallBusinessFit += 3
    reasons.push("소기업확인서 보유 — 소기업 우대 공고 유리(추정)")
  }
  if (profile.hasSoftwareBusinessRegistration) {
    smallBusinessFit += 2
  }
  if (profile.hasVentureCertification || profile.hasWomenEnterpriseCertification || profile.hasDisabilityEnterpriseCertification) {
    smallBusinessFit += 2
    reasons.push("벤처/여성/장애인 기업 인증 — 가점 가능(추정)")
  }
  smallBusinessFit = clamp(smallBusinessFit, 0, 15)

  // 6) competitionFit (10) — 경쟁 과열 낮음 (휴리스틱 추정)
  let competitionFit = 6 // 기본 중립
  if (bid.qualificationSummary && /제한/.test(bid.qualificationSummary)) {
    competitionFit += 3 // 자격 제한이 있으면 경쟁자 수 감소 (추정) — 최대 10 도달 가능
    reasons.push("참가/업종 제한 존재 — 경쟁자 수 제한적일 수 있음(추정)")
  }
  if (price !== undefined && price >= budgetMin && price <= budgetMax) {
    competitionFit += 1 // 적정 규모 — 과도한 경쟁 가능성 낮음(추정)
  }
  if (price !== undefined && price < budgetMin) {
    competitionFit -= 1 // 소액은 경쟁 과열 경향 (추정)
  }
  competitionFit = clamp(competitionFit, 0, 10)

  // === 감점 (휴리스틱) ===
  // 특정 제조사 제품 납품 중심
  if (/납품|구매|라이선스|라이센스/.test(bid.title)) {
    categoryFit = clamp(categoryFit - 4, 0, 30)
    risks.push("장비/제품 납품 중심일 수 있음 — 개발 역량과 적합성 확인 필요(추정)")
  }
  // 과업 범위 과다 / 상주
  if (/상주|파견|운영인력/.test(bid.title)) {
    risks.push("상주·운영인력 조건 가능성 — 인력 부담 확인 필요(추정)")
    smallBusinessFit = clamp(smallBusinessFit - 2, 0, 15)
  }

  const total = clamp(
    categoryFit + budgetFit + deadlineFit + regionFit + smallBusinessFit + competitionFit,
    0,
    100
  )

  let decision: BidScore["decision"]
  if (total >= 70) decision = "바로 검토"
  else if (total >= 45) decision = "조건 확인 후 검토"
  else decision = "비추천"

  // 명백한 차단 요소는 비추천으로 강등
  if (h !== undefined && h < 0) decision = "비추천"
  if (regionFit <= 1 && myRegions.length > 0) decision = "비추천"

  return {
    total,
    categoryFit,
    budgetFit,
    deadlineFit,
    regionFit,
    smallBusinessFit,
    competitionFit,
    reasons,
    risks,
    decision,
  }
}
