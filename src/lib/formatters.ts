/**
 * BidNotice / 결과 → 한국어 Markdown 포맷
 * - 마크다운 표 대신 카드/리스트 사용 (복사 시 정렬 깨짐 방지)
 * - 금액은 억/만원으로 읽기 쉽게 표기
 * - 값이 없는 항목은 숨겨서 "확인 필요" 노이즈 최소화
 */

import type { BidNotice, BidScore } from "./types.js"
import { formatMoney, UNKNOWN } from "./normalizer.js"

/** 점수 → 별점 */
export function stars(total: number): string {
  if (total >= 80) return "★★★"
  if (total >= 65) return "★★☆"
  if (total >= 45) return "★☆☆"
  return "☆☆☆"
}

/** 순위 → 메달/번호 */
function rankBadge(rank: number): string {
  if (rank === 1) return "🥇"
  if (rank === 2) return "🥈"
  if (rank === 3) return "🥉"
  return `${rank}.`
}

/** 판단 → 아이콘 */
function decisionIcon(decision?: BidScore["decision"]): string {
  if (decision === "바로 검토") return "✅"
  if (decision === "조건 확인 후 검토") return "🟡"
  if (decision === "비추천") return "⛔"
  return "•"
}

/** 남은 시간 사람이 읽는 형태 */
export function humanizeHours(h: number | undefined): string {
  if (h === undefined) return UNKNOWN
  if (h < 0) return "마감됨"
  if (h < 1) return `${Math.round(h * 60)}분 남음`
  if (h < 48) return `${Math.round(h)}시간 남음`
  return `${Math.floor(h / 24)}일 남음`
}

/** 금액을 억/만원으로 짧게 (예: 141,000,000 → "1억 4,100만원") */
export function formatMoneyShort(amount: number | undefined): string {
  if (amount === undefined) return UNKNOWN
  if (amount >= 100_000_000) {
    const eok = Math.floor(amount / 100_000_000)
    const man = Math.round((amount % 100_000_000) / 10_000)
    return man > 0 ? `${eok}억 ${man.toLocaleString("ko-KR")}만원` : `${eok}억원`
  }
  if (amount >= 10_000) {
    return `${Math.round(amount / 10_000).toLocaleString("ko-KR")}만원`
  }
  return `${amount.toLocaleString("ko-KR")}원`
}

/** 금액: 짧은 표기 + 정확한 원 (예: "1억 4,100만원 (141,000,000원)") */
function moneyFull(amount: number | undefined): string {
  if (amount === undefined) return UNKNOWN
  return `${formatMoneyShort(amount)} (${formatMoney(amount)})`
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + "…"
}

/** 한 줄 요약 (빠른 훑어보기용) */
function summaryLine(rank: number, bid: BidNotice, score?: BidScore): string {
  const badge = rankBadge(rank)
  const icon = decisionIcon(score?.decision)
  const pts = score ? `**${score.total}점**` : ""
  const money = bid.estimatedPrice !== undefined ? formatMoneyShort(bid.estimatedPrice) : "예산 미정"
  const deadline = bid.closeDateTime ? `~${bid.closeDateTime.slice(5, 16)}` : "마감 미정"
  return `${badge} ${icon} ${pts} ${truncate(bid.title, 42)}\n   └ ${bid.agencyName ?? UNKNOWN} · ${money} · ${deadline}`
}

/** 검색결과: 요약 리스트 + 공고별 카드 */
export function formatSearchResults(
  bids: BidNotice[],
  scores: Map<string, BidScore>,
  opts: { totalCount: number; title: string; topN?: number }
): string {
  const { totalCount, title, topN = 10 } = opts
  const lines: string[] = []
  lines.push(`# 🔎 ${title}`)
  lines.push("")
  lines.push(`> 필터 후 **${bids.length}건** · API 전체 ${totalCount}건`)
  lines.push("")

  if (bids.length === 0) {
    lines.push("조건에 맞는 공고가 없습니다.")
    return lines.join("\n")
  }

  const shown = bids.slice(0, topN)

  lines.push(`## 📊 추천 TOP ${shown.length} — 빠른 훑어보기`)
  lines.push("")
  shown.forEach((bid, i) => lines.push(summaryLine(i + 1, bid, scores.get(bidKey(bid)))))
  lines.push("")
  lines.push("---")
  lines.push("")
  lines.push("## 📋 공고별 상세")
  shown.forEach((bid, i) => {
    lines.push("")
    lines.push(formatBidCard(i + 1, bid, scores.get(bidKey(bid))))
  })

  return lines.join("\n")
}

/**
 * 단일 공고 카드 (값 없는 항목은 숨김 → 노이즈 최소화)
 * @param rank 1부터. 0 이하면 순위 배지 생략
 */
export function formatBidCard(rank: number, bid: BidNotice, score?: BidScore): string {
  const lines: string[] = []
  const head = rank > 0 ? `${rankBadge(rank)} ` : ""
  if (score) {
    lines.push(`### ${head}${score.total}점 · ${decisionIcon(score.decision)} ${score.decision}`)
  } else {
    lines.push(`### ${head}${bid.title}`)
  }
  if (score) lines.push(`**${bid.title}**`)
  lines.push("")

  // 기관
  const org =
    bid.agencyName && bid.demandOrgName && bid.agencyName !== bid.demandOrgName
      ? `${bid.agencyName} (수요: ${bid.demandOrgName})`
      : bid.agencyName ?? bid.demandOrgName
  if (org) lines.push(`- 🏢 **기관**: ${org}`)

  // 분류 · 계약 · 입찰방식 (있는 것만)
  const meta = [bid.itCategory, bid.contractMethod, bid.bidMethod].filter(Boolean).join(" · ")
  if (meta) lines.push(`- 🗂 **분류**: ${meta}`)

  // 예산
  lines.push(`- 💰 **추정가격**: ${moneyFull(bid.estimatedPrice)}`)
  if (bid.baseAmount !== undefined) lines.push(`- 💵 **기초금액**: ${moneyFull(bid.baseAmount)}`)

  // 일정
  const sched = `${bid.closeDateTime ?? UNKNOWN}${bid.hoursToDeadline !== undefined ? ` (${humanizeHours(bid.hoursToDeadline)})` : ""}`
  lines.push(`- ⏰ **입찰마감**: ${sched}`)
  if (bid.openDateTime) lines.push(`- 🔓 **개찰**: ${bid.openDateTime}`)

  // 지역/자격 (있는 것만)
  if (bid.regionLimit) lines.push(`- 📍 **지역제한**: ${bid.regionLimit}`)
  if (bid.qualificationSummary) lines.push(`- 📄 **참가자격**: ${bid.qualificationSummary}`)
  if (bid.spldmdNm) lines.push(`- 🤝 **공동수급**: ${bid.spldmdNm}`)

  // 공고번호 + 원문
  lines.push(`- 🧾 **공고번호**: ${bid.bidNo}${bid.bidOrd ? ` (차수 ${bid.bidOrd})` : ""}`)
  if (bid.originalUrl) lines.push(`- 🔗 [원문 보기](${bid.originalUrl})`)

  // 추천 사유 / 리스크 (인용 블록)
  if (score) {
    if (score.reasons.length) lines.push(`> 💡 **추천 이유**: ${score.reasons.join("; ")}`)
    if (score.risks.length) lines.push(`> ⚠️ **리스크**: ${score.risks.join("; ")}`)
  }
  return lines.join("\n")
}

/** 하위호환: 기존 이름 유지 (다른 도구에서 사용) */
export const formatBidBlock = formatBidCard

/** 공고 고유 키 (점수 맵 연결용) */
export function bidKey(bid: BidNotice): string {
  return `${bid.bidNo}-${bid.bidOrd ?? ""}`
}
