/**
 * 간단한 인메모리 캐시 (TTL + LRU)
 * 동일 공고 재조회 시 API 호출을 절약한다 (일 1,000건 트래픽 제한 대응).
 * 출처: korean-law-mcp의 SimpleCache 패턴 차용.
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // 유효시간(ms)
}

export class SimpleCache {
  private cache: Map<string, CacheEntry<unknown>>
  private maxSize: number

  constructor(maxSize = 200) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  set<T>(key: string, data: T, ttl: number = 10 * 60 * 1000): void {
    // 기본 TTL 10분
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOne()
    }
    // 기존 키 업데이트 시 Map 순서를 끝으로 이동 (LRU 정합성)
    this.cache.delete(key)
    this.cache.set(key, { data, timestamp: Date.now(), ttl })
  }

  /** 만료 엔트리 우선 제거, 없으면 LRU(가장 오래된) 제거 */
  private evictOne(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        return
      }
    }
    const oldestKey = this.cache.keys().next().value
    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey)
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    // LRU 승격: Map 순서 끝으로 이동
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.data as T
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// 전역 캐시 인스턴스
export const bidCache = new SimpleCache(300)

// 1시간마다 만료 엔트리 정리 (프로세스 종료를 막지 않도록 unref)
setInterval(() => {
  bidCache.cleanup()
}, 60 * 60 * 1000).unref()
