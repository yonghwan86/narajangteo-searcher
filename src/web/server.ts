/**
 * 독립 앱용 로컬 HTTP 서버
 * - GET /              검색 UI 페이지
 * - GET /api/config    인증키 설정 여부
 * - POST /api/config   인증키 저장
 * - GET /api/search    검색 실행 → JSON
 * 시작 시 기본 브라우저를 자동으로 연다.
 */

import http from "node:http"
import { spawn } from "node:child_process"
import { G2bClient } from "../lib/g2bClient.js"
import { G2bApiError, ErrorCodes } from "../lib/errors.js"
import { runItSearch } from "../lib/search-engine.js"
import { fetchAllBidders } from "../lib/openg-scraper.js"
import { formatMoneyShort, humanizeHours } from "../lib/formatters.js"
import { formatMoney } from "../lib/normalizer.js"
import { todayRange, recentDaysRange } from "../lib/dateutil.js"
import { renderUiPage } from "./ui.js"
import { loadConfig, saveConfig, applyToEnv, hasServiceKey } from "./config-store.js"

const client = new G2bClient()

function send(res: http.ServerResponse, status: number, body: string, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType })
  res.end(body)
}
function sendJson(res: http.ServerResponse, status: number, obj: unknown) {
  send(res, status, JSON.stringify(obj), "application/json; charset=utf-8")
}

function rangeForPeriod(period: string): { bgn: string; end: string } {
  if (period === "today") return todayRange()
  const days = parseInt(period, 10)
  return recentDaysRange(isNaN(days) ? 7 : days)
}

async function handleSearch(url: URL, res: http.ServerResponse) {
  if (!hasServiceKey()) {
    return sendJson(res, 200, { ok: false, needKey: true, error: "인증키가 설정되지 않았습니다. 먼저 인증키를 설정하세요." })
  }
  const q = url.searchParams
  const business = (q.get("business") || "용역") as "전체" | "용역" | "물품" | "공사" | "외자" | "기타"
  const { bgn, end } = rangeForPeriod(q.get("period") || "7")

  try {
    const num = (s: string | null) => (s && !isNaN(Number(s)) ? Number(s) : undefined)
    const list = (s: string | null) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : undefined)

    const result = await runItSearch(client, {
      business,
      bgn,
      end,
      keywords: list(q.get("keywords")),
      excludeKeywords: list(q.get("excludeKeywords")),
      minBudget: num(q.get("minBudget")),
      maxBudget: num(q.get("maxBudget")),
      region: q.get("region") || undefined,
      includeNationwide: true,
      deadlineWithinDays: num(q.get("deadlineWithinDays")),
      spldmdCd: q.get("spldmdCd") || undefined,
    })

    // 개찰결과 분석 모드: 마감(개찰 대상)된 공고만
    const closedOnly = q.get("closedOnly") === "1"
    const baseBids = closedOnly
      ? result.bids.filter((b) => b.hoursToDeadline !== undefined && b.hoursToDeadline < 0)
      : result.bids

    const MAX_ITEMS = 500
    const capped = baseBids.length > MAX_ITEMS
    const scored = baseBids
      .slice(0, MAX_ITEMS)
      .map((bid) => ({ bid, score: result.scores.get(`${bid.bidNo}-${bid.bidOrd ?? ""}`)! }))

    const items = scored.map(({ bid, score }, i) => ({
      rank: i + 1,
      total: score.total,
      decision: score.decision,
      itCategory: bid.itCategory,
      title: bid.title,
      originalUrl: bid.originalUrl,
      agencyName: bid.agencyName,
      demandOrgName: bid.demandOrgName,
      estimatedPrice: bid.estimatedPrice ?? 0,
      priceShort: bid.estimatedPrice !== undefined ? formatMoneyShort(bid.estimatedPrice) : "확인 필요",
      closeDateTime: bid.closeDateTime,
      openDateTime: bid.openDateTime,
      opengDate: bid.openDateTime ? bid.openDateTime.slice(0, 10) : "",
      deadlineText: bid.hoursToDeadline !== undefined ? humanizeHours(bid.hoursToDeadline) : "",
      contractMethod: bid.contractMethod,
      spldmd: bid.spldmdNm || (bid.spldmdCd ? bid.spldmdCd : "—"),
      bidNo: bid.bidNo,
      bidOrd: bid.bidOrd,
      business: bid.businessType,
      reasons: score.reasons,
      risks: score.risks,
    }))

    sendJson(res, 200, {
      ok: true,
      totalCount: baseBids.length,
      matchedBeforeFilter: result.matchedBeforeFilter,
      capped,
      shown: items.length,
      items,
      apiCalls: result.apiCalls,
      truncated: result.truncated,
    })
  } catch (e) {
    const needKey = e instanceof G2bApiError && (e.code === ErrorCodes.NO_API_KEY || e.code === ErrorCodes.AUTH_ERROR)
    sendJson(res, 200, { ok: false, needKey, error: e instanceof Error ? e.message : String(e) })
  }
}

/** 개찰결과 전체 투찰자 명단 (나라장터 스크래핑) — 인증키 불필요 */
async function handleOpengBidders(url: URL, res: http.ServerResponse) {
  const q = url.searchParams
  const bidNo = (q.get("bidNo") || "").trim()
  if (!bidNo) return sendJson(res, 200, { ok: false, error: "공고번호(bidNo)가 필요합니다." })
  const bidOrd = (q.get("bidOrd") || "000").trim() || "000"

  try {
    const result = await fetchAllBidders(bidNo, bidOrd)
    const bidders = result.bidders.map((b) => ({
      rank: b.rank ?? null,
      bizno: b.bizno || "",
      companyName: b.companyName || "",
      ceoName: b.ceoName || "",
      bidAmount: b.bidAmount ?? null,
      bidAmountText: b.bidAmount !== undefined ? formatMoney(b.bidAmount) : "",
      bidRate: b.bidRate || "",
      remark: b.remark || "",
      bidDateTime: b.bidDateTime || "",
    }))
    sendJson(res, 200, {
      ok: true,
      bidNo: result.bidNo,
      bidOrd: result.bidOrd,
      bidName: result.bidName ?? "",
      opengDateTime: result.opengDateTime ?? "",
      participantCount: result.participantCount,
      count: bidders.length,
      bidders,
    })
  } catch (e) {
    sendJson(res, 200, { ok: false, error: e instanceof Error ? e.message : String(e) })
  }
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = ""
    req.on("data", (c) => (data += c))
    req.on("end", () => resolve(data))
  })
}

export function startWebServer(preferredPort = 7777): Promise<{ port: number; url: string }> {
  // 저장된 설정을 env 에 주입
  applyToEnv(loadConfig())

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://localhost")
      if (req.method === "GET" && url.pathname === "/") {
        return send(res, 200, renderUiPage(), "text/html; charset=utf-8")
      }
      if (url.pathname === "/api/config") {
        if (req.method === "GET") return sendJson(res, 200, { hasKey: hasServiceKey() })
        if (req.method === "POST") {
          const body = await readBody(req)
          let parsed: { serviceKey?: string; isEncoded?: boolean }
          try {
            parsed = JSON.parse(body)
          } catch {
            return sendJson(res, 400, { error: "잘못된 요청 형식" })
          }
          if (!parsed.serviceKey || !parsed.serviceKey.trim()) return sendJson(res, 400, { error: "키가 비어 있습니다." })
          saveConfig({ serviceKey: parsed.serviceKey.trim(), isEncoded: !!parsed.isEncoded })
          return sendJson(res, 200, { ok: true })
        }
      }
      if (req.method === "GET" && url.pathname === "/api/search") {
        return handleSearch(url, res)
      }
      if (req.method === "GET" && url.pathname === "/api/openg-bidders") {
        return handleOpengBidders(url, res)
      }
      send(res, 404, "Not Found")
    } catch (e) {
      sendJson(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) })
    }
  })

  return new Promise((resolve, reject) => {
    let port = preferredPort
    const tryListen = () => {
      server.once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE" && port < preferredPort + 20) {
          port++
          tryListen()
        } else reject(err)
      })
      server.listen(port, "127.0.0.1", () => {
        const url = `http://localhost:${port}/`
        resolve({ port, url })
      })
    }
    tryListen()
  })
}

/** OS 기본 브라우저로 URL 열기 */
export function openUrl(target: string): void {
  const platform = process.platform
  try {
    if (platform === "win32") spawn("cmd", ["/c", "start", "", target], { detached: true, stdio: "ignore" }).unref()
    else if (platform === "darwin") spawn("open", [target], { detached: true, stdio: "ignore" }).unref()
    else spawn("xdg-open", [target], { detached: true, stdio: "ignore" }).unref()
  } catch {
    /* ignore */
  }
}
