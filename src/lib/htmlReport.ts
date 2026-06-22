/**
 * 검색 결과 → 독립 실행형 HTML 리포트 (정렬/필터/원문링크 가능)
 * 별도 브라우저 창에 띄워 보기 위한 용도.
 */

import type { BidNotice, BidScore } from "./types.js"
import { formatMoneyShort, humanizeHours } from "./formatters.js"
import { formatMoney, UNKNOWN } from "./normalizer.js"

export interface ReportItem {
  bid: BidNotice
  score?: BidScore
}

function esc(s: string | undefined): string {
  if (s === undefined || s === null) return ""
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function decisionClass(d?: BidScore["decision"]): string {
  if (d === "바로 검토") return "go"
  if (d === "조건 확인 후 검토") return "maybe"
  if (d === "비추천") return "no"
  return "na"
}

function rows(items: ReportItem[]): string {
  return items
    .map((it, i) => {
      const b = it.bid
      const s = it.score
      const total = s ? s.total : ""
      const decision = s ? s.decision : ""
      const price = b.estimatedPrice
      const priceShort = price !== undefined ? formatMoneyShort(price) : UNKNOWN
      const priceExact = price !== undefined ? String(price) : "0"
      const titleCell = b.originalUrl
        ? `<a href="${esc(b.originalUrl)}" target="_blank" rel="noopener">${esc(b.title)}</a>`
        : esc(b.title)
      const reasons = s?.reasons?.length ? esc(s.reasons.join("; ")) : ""
      const risks = s?.risks?.length ? esc(s.risks.join("; ")) : ""
      const hours = b.hoursToDeadline
      const closeSort = b.closeDateTime ? esc(b.closeDateTime) : "9999"
      return `<tr class="${decisionClass(decision as BidScore["decision"])}">
  <td class="num">${i + 1}</td>
  <td class="num" data-sort="${total}">${total}</td>
  <td><span class="badge ${decisionClass(decision as BidScore["decision"])}">${esc(decision)}</span></td>
  <td class="cat">${esc(b.itCategory)}</td>
  <td class="title">${titleCell}<div class="sub">${reasons ? "💡 " + reasons : ""}${risks ? '<div class="risk">⚠️ ' + risks + "</div>" : ""}</div></td>
  <td>${esc(b.agencyName ?? b.demandOrgName)}</td>
  <td class="num" data-sort="${priceExact}">${esc(priceShort)}</td>
  <td data-sort="${closeSort}">${esc(b.closeDateTime ?? UNKNOWN)}<div class="sub">${hours !== undefined ? humanizeHours(hours) : ""}</div></td>
  <td class="no-wrap">${esc(b.contractMethod)}</td>
  <td class="bidno">${esc(b.bidNo)}</td>
</tr>`
    })
    .join("\n")
}

export function buildHtmlReport(title: string, items: ReportItem[], meta?: { totalCount?: number; generatedAt?: string }): string {
  const count = items.length
  const totalCount = meta?.totalCount
  const generatedAt = meta?.generatedAt ?? ""
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { --go:#1a7f37; --maybe:#9a6700; --no:#cf222e; --na:#57606a; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI','Malgun Gothic',sans-serif; margin:0; background:#f6f8fa; color:#1f2328; }
  header { position:sticky; top:0; background:#0d1117; color:#fff; padding:14px 20px; z-index:10; box-shadow:0 1px 4px rgba(0,0,0,.2); }
  header h1 { margin:0; font-size:18px; }
  header .meta { font-size:13px; color:#9aa4af; margin-top:4px; }
  .toolbar { padding:12px 20px; background:#fff; border-bottom:1px solid #d0d7de; display:flex; gap:10px; flex-wrap:wrap; align-items:center; position:sticky; top:56px; z-index:9; }
  .toolbar input, .toolbar select { padding:7px 10px; border:1px solid #d0d7de; border-radius:6px; font-size:14px; }
  .toolbar input[type=search] { min-width:260px; }
  .toolbar .hint { font-size:12px; color:#57606a; }
  table { border-collapse:collapse; width:100%; background:#fff; }
  th, td { padding:9px 12px; border-bottom:1px solid #eaeef2; text-align:left; vertical-align:top; font-size:14px; }
  th { background:#f6f8fa; position:sticky; top:104px; cursor:pointer; user-select:none; white-space:nowrap; z-index:8; }
  th:hover { background:#eef1f4; }
  th.sorted-asc::after { content:" ▲"; color:#0969da; }
  th.sorted-desc::after { content:" ▼"; color:#0969da; }
  td.num { text-align:right; font-variant-numeric:tabular-nums; }
  td.title { max-width:520px; }
  td.title a { color:#0969da; text-decoration:none; font-weight:600; }
  td.title a:hover { text-decoration:underline; }
  td.bidno { font-family:monospace; font-size:12px; color:#57606a; }
  .no-wrap { white-space:nowrap; }
  .sub { font-size:12px; color:#57606a; margin-top:3px; line-height:1.4; }
  .sub .risk { color:#cf222e; }
  .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; font-weight:600; color:#fff; white-space:nowrap; }
  .badge.go { background:var(--go); } .badge.maybe { background:var(--maybe); } .badge.no { background:var(--no); } .badge.na { background:var(--na); }
  tr.go td:first-child { border-left:4px solid var(--go); }
  tr.maybe td:first-child { border-left:4px solid var(--maybe); }
  tr.no td:first-child { border-left:4px solid var(--no); }
  tr:hover { background:#f6faff; }
  .footer { padding:16px 20px; font-size:12px; color:#57606a; }
</style>
</head>
<body>
<header>
  <h1>🔎 ${esc(title)}</h1>
  <div class="meta">표시 ${count}건${totalCount !== undefined ? ` · API 전체 ${totalCount}건` : ""}${generatedAt ? ` · 생성 ${esc(generatedAt)}` : ""}</div>
</header>
<div class="toolbar">
  <input type="search" id="q" placeholder="공고명·기관 검색…">
  <select id="decision">
    <option value="">전체 판단</option>
    <option value="바로 검토">✅ 바로 검토</option>
    <option value="조건 확인 후 검토">🟡 조건 확인 후 검토</option>
    <option value="비추천">⛔ 비추천</option>
  </select>
  <span class="hint">열 머리글 클릭 → 정렬 · 공고명 클릭 → 원문</span>
</div>
<table id="t">
  <thead>
    <tr>
      <th data-type="num">순위</th>
      <th data-type="num">점수</th>
      <th data-type="str">판단</th>
      <th data-type="str">분류</th>
      <th data-type="str">공고명 / 추천이유</th>
      <th data-type="str">기관</th>
      <th data-type="num">추정가격</th>
      <th data-type="str">마감</th>
      <th data-type="str">계약방법</th>
      <th data-type="str">공고번호</th>
    </tr>
  </thead>
  <tbody>
${rows(items)}
  </tbody>
</table>
<div class="footer">g2b-it-bid-mcp · 조달청 나라장터 입찰공고정보서비스 기반 · 점수의 '경쟁/대기업 제한' 항목은 휴리스틱 추정입니다.</div>
<script>
  const tbody = document.querySelector('#t tbody');
  const rowsArr = Array.from(tbody.querySelectorAll('tr'));
  // 필터
  const q = document.getElementById('q'), dec = document.getElementById('decision');
  function applyFilter() {
    const term = q.value.trim().toLowerCase();
    const d = dec.value;
    rowsArr.forEach(tr => {
      const text = tr.innerText.toLowerCase();
      const okText = !term || text.includes(term);
      const okDec = !d || tr.querySelector('.badge')?.textContent.trim() === d;
      tr.style.display = (okText && okDec) ? '' : 'none';
    });
  }
  q.addEventListener('input', applyFilter);
  dec.addEventListener('change', applyFilter);
  // 정렬
  const ths = document.querySelectorAll('#t th');
  ths.forEach((th, idx) => th.addEventListener('click', () => {
    const type = th.dataset.type;
    const asc = !th.classList.contains('sorted-asc');
    ths.forEach(h => h.classList.remove('sorted-asc','sorted-desc'));
    th.classList.add(asc ? 'sorted-asc' : 'sorted-desc');
    const visible = rowsArr;
    visible.sort((a, b) => {
      let av = a.children[idx].dataset.sort ?? a.children[idx].innerText;
      let bv = b.children[idx].dataset.sort ?? b.children[idx].innerText;
      if (type === 'num') { av = parseFloat(av)||0; bv = parseFloat(bv)||0; return asc ? av-bv : bv-av; }
      return asc ? String(av).localeCompare(String(bv),'ko') : String(bv).localeCompare(String(av),'ko');
    });
    visible.forEach(tr => tbody.appendChild(tr));
  }));
</script>
</body>
</html>`
}
