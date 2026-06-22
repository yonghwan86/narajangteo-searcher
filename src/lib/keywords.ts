/**
 * IT 키워드 및 카테고리 분류
 */

/** search_it_bids 기본 IT 키워드 */
export const DEFAULT_IT_KEYWORDS: string[] = [
  "소프트웨어", "SW", "시스템", "정보시스템", "홈페이지", "웹사이트",
  "앱", "모바일", "유지보수", "통합유지보수", "클라우드",
  "AI", "인공지능", "빅데이터", "데이터", "분석",
  "RPA", "챗봇", "보안", "DB", "ERP", "그룹웨어",
]

/**
 * 서버측 공고명 검색용 핵심 키워드 (사용자가 키워드를 안 줄 때 기본 사용).
 * 호출 수를 줄이기 위해 광범위하게 겹치는 대표 어근만 추림.
 */
export const CORE_IT_SEARCH_TERMS: string[] = [
  "시스템", "소프트웨어", "유지보수", "홈페이지", "데이터", "AI", "정보화", "클라우드", "보안", "구축",
]

/** IT 카테고리 (공고명 기준 자동 분류) */
export type ItCategory =
  | "SI/시스템 구축"
  | "홈페이지/웹 개발"
  | "모바일 앱"
  | "유지보수"
  | "클라우드"
  | "AI/인공지능"
  | "데이터/빅데이터"
  | "보안"
  | "ERP/그룹웨어"
  | "장비/솔루션 납품"
  | "기타 IT"
  | "비IT"

/** 카테고리별 매칭 키워드 (위에서부터 우선순위) */
const CATEGORY_RULES: Array<{ category: ItCategory; patterns: RegExp }> = [
  { category: "AI/인공지능", patterns: /(AI|인공지능|머신러닝|딥러닝|챗봇|RPA|자동화)/i },
  { category: "데이터/빅데이터", patterns: /(빅데이터|데이터\s*분석|데이터베이스구축|데이터\s*구축|분석시스템|데이터댐)/i },
  { category: "보안", patterns: /(보안|정보보호|침해대응|관제|백신|방화벽|취약점)/i },
  { category: "클라우드", patterns: /(클라우드|cloud|가상화|서버\s*이전|인프라\s*전환)/i },
  { category: "모바일 앱", patterns: /(모바일|앱[\s,)]|앱$|앱개발|어플리케이션|application|android|ios)/i },
  { category: "홈페이지/웹 개발", patterns: /(홈페이지|웹사이트|웹\s*개발|포털|누리집|반응형|website)/i },
  { category: "ERP/그룹웨어", patterns: /(ERP|그룹웨어|전사적자원|회계시스템|인사시스템)/i },
  { category: "유지보수", patterns: /(유지보수|유지관리|운영\s*및\s*유지|위탁운영|상주\s*유지)/i },
  { category: "SI/시스템 구축", patterns: /(시스템\s*구축|정보시스템|SI\b|구축\s*용역|고도화|재구축|통합구축)/i },
  { category: "장비/솔루션 납품", patterns: /(납품|구매|솔루션\s*도입|장비|라이선스|라이센스|서버\s*구매|PC\s*구매)/i },
]

/** 공동수급방식 선택지 (필터/도구 공용) — 코드와 라벨 매핑 */
export const SPLDMD_OPTIONS: Array<{ code: string; label: string }> = [
  { code: "공500001", label: "공동이행" },
  { code: "공500002", label: "분담이행" },
  { code: "공500006", label: "공동이행 또는 분담이행" },
]

/** 라벨 → 코드 (도구 입력용) */
export const SPLDMD_LABEL_TO_CODE: Record<string, string> = Object.fromEntries(
  SPLDMD_OPTIONS.map((o) => [o.label, o.code])
)

/** 공고명에서 IT 여부를 키워드로 판정 */
export function matchesItKeywords(title: string, keywords: string[]): boolean {
  if (!title) return false
  const lower = title.toLowerCase()
  return keywords.some((kw) => kw && lower.includes(kw.toLowerCase()))
}

/** 제외 키워드 포함 여부 */
export function matchesExcludeKeywords(title: string, excludeKeywords: string[]): boolean {
  if (!title || !excludeKeywords || excludeKeywords.length === 0) return false
  const lower = title.toLowerCase()
  return excludeKeywords.some((kw) => kw && lower.includes(kw.toLowerCase()))
}

/** 공고명을 IT 카테고리로 분류 */
export function classifyItCategory(title: string): ItCategory {
  if (!title) return "비IT"
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.test(title)) return rule.category
  }
  // IT 키워드 자체엔 걸리지만 세부 카테고리 미매칭
  if (matchesItKeywords(title, DEFAULT_IT_KEYWORDS)) return "기타 IT"
  return "비IT"
}
