/**
 * 독립 앱 검색 UI (단일 HTML 페이지)
 * 폼 입력 → /api/search 호출 → 정렬·필터 가능한 결과표 렌더링.
 */

export function renderUiPage(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>나라장터 IT 입찰공고 검색기</title>
<style>
  :root { --go:#1a7f37; --maybe:#9a6700; --no:#cf222e; --na:#57606a; --blue:#0969da; }
  * { box-sizing:border-box; }
  body { font-family:'Segoe UI','Malgun Gothic',sans-serif; margin:0; background:#f6f8fa; color:#1f2328; }
  header { background:#0d1117; color:#fff; padding:14px 20px; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
  header h1 { margin:0; font-size:18px; }
  header .sub { color:#9aa4af; font-size:13px; }
  .keybar { margin-left:auto; display:flex; align-items:center; gap:8px; font-size:13px; }
  .keybar .dot { width:9px; height:9px; border-radius:50%; background:#cf222e; display:inline-block; }
  .keybar .dot.on { background:#2ea043; }
  .keybar button, .panel button { cursor:pointer; }
  .panel { background:#fff; border-bottom:1px solid #d0d7de; padding:14px 20px; }
  .form-grid { display:flex; flex-wrap:wrap; gap:12px; align-items:flex-end; }
  .field { display:flex; flex-direction:column; gap:4px; }
  .field label { font-size:12px; color:#57606a; font-weight:600; }
  .field input, .field select { padding:8px 10px; border:1px solid #d0d7de; border-radius:6px; font-size:14px; }
  .field input.sm { width:110px; } .field input.kw { width:320px; } .field input.rg { width:90px; }
  #searchBtn { background:var(--blue); color:#fff; border:none; padding:10px 22px; border-radius:6px; font-size:15px; font-weight:700; }
  #searchBtn:disabled { opacity:.6; }
  .toolbar { padding:10px 20px; background:#fff; border-bottom:1px solid #eaeef2; display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
  .toolbar input, .toolbar select { padding:7px 10px; border:1px solid #d0d7de; border-radius:6px; font-size:14px; }
  .toolbar input[type=search] { min-width:240px; }
  #status { padding:10px 20px; font-size:14px; color:#57606a; }
  table { border-collapse:collapse; width:100%; background:#fff; }
  th, td { padding:9px 12px; border-bottom:1px solid #eaeef2; text-align:left; vertical-align:top; font-size:14px; }
  th { background:#f6f8fa; position:sticky; top:0; cursor:pointer; user-select:none; white-space:nowrap; z-index:5; }
  th:hover { background:#eef1f4; }
  th.asc::after { content:" ▲"; color:var(--blue); } th.desc::after { content:" ▼"; color:var(--blue); }
  td.num { text-align:right; font-variant-numeric:tabular-nums; }
  td.title { max-width:520px; }
  td.title a { color:var(--blue); text-decoration:none; font-weight:600; }
  td.title a:hover { text-decoration:underline; }
  td.bidno { font-family:monospace; font-size:12px; color:#57606a; }
  .sub2 { font-size:12px; color:#57606a; margin-top:3px; line-height:1.4; }
  .sub2 .risk { color:#cf222e; }
  .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; font-weight:600; color:#fff; white-space:nowrap; }
  .badge.go{background:var(--go)} .badge.maybe{background:var(--maybe)} .badge.no{background:var(--no)} .badge.na{background:var(--na)}
  tr.go td:first-child{border-left:4px solid var(--go)} tr.maybe td:first-child{border-left:4px solid var(--maybe)} tr.no td:first-child{border-left:4px solid var(--no)}
  tr:hover { background:#f6faff; }
  .modal { position:fixed; inset:0; background:rgba(0,0,0,.5); display:none; align-items:center; justify-content:center; z-index:50; }
  .modal.show { display:flex; }
  .modal .box { background:#fff; padding:24px; border-radius:10px; width:480px; max-width:90vw; }
  .modal .box.wide { width:900px; max-height:86vh; overflow:auto; }
  .opbtn { padding:5px 10px; border:1px solid #d0d7de; background:#fff; border-radius:6px; font-size:12px; cursor:pointer; white-space:nowrap; }
  .opbtn:hover { background:#f3f6f9; border-color:var(--blue); color:var(--blue); }
  table.op { border-collapse:collapse; width:100%; margin-top:10px; }
  table.op th, table.op td { padding:7px 10px; border-bottom:1px solid #eaeef2; font-size:13px; text-align:left; }
  table.op th { background:#f6f8fa; }
  table.op td.num { text-align:right; font-variant-numeric:tabular-nums; }
  table.op tr.win td { font-weight:700; color:#1a7f37; }
  .modal h2 { margin:0 0 12px; font-size:17px; }
  .modal p { font-size:13px; color:#57606a; line-height:1.6; }
  .modal input { width:100%; padding:9px 10px; border:1px solid #d0d7de; border-radius:6px; font-size:14px; margin:6px 0; }
  .modal .row { display:flex; gap:8px; justify-content:flex-end; margin-top:12px; }
  .modal .row button { padding:9px 18px; border-radius:6px; border:1px solid #d0d7de; background:#fff; }
  .modal .row button.primary { background:var(--blue); color:#fff; border:none; }
  .err { color:var(--no); }
  .footer { padding:14px 20px; font-size:12px; color:#57606a; }
  a.link { color:var(--blue); cursor:pointer; }
  /* 모드 탭 */
  .tabs { display:flex; gap:0; background:#0d1117; padding:0 20px; }
  .tabs button { background:transparent; color:#9aa4af; border:none; border-bottom:3px solid transparent; padding:11px 20px; font-size:14px; font-weight:600; cursor:pointer; }
  .tabs button.active { color:#fff; border-bottom-color:var(--blue); }
  .tabs button:hover { color:#fff; }
  /* 개찰결과 분석 탭 */
  .ohint { padding:8px 20px; font-size:12px; color:#57606a; background:#fff; border-bottom:1px solid #eaeef2; }
  tr.orow { cursor:pointer; }
  tr.orow:hover { background:#f0f6ff; }
  tr.orow .chev { color:var(--blue); font-weight:700; display:inline-block; width:14px; }
  tr.odetail > td { background:#f8fbff; padding:0; }
  .obox { padding:12px 16px 16px; }
  .obox .ohead { font-size:13px; color:#57606a; margin-bottom:8px; }
  .obox .ocsv { float:right; background:#1a7f37; color:#fff; border:none; padding:5px 12px; border-radius:6px; font-weight:600; cursor:pointer; font-size:12px; }
  table.ob { border-collapse:collapse; width:100%; }
  table.ob th, table.ob td { padding:6px 10px; border-bottom:1px solid #e6ebf1; font-size:13px; text-align:left; }
  table.ob th { background:#eef2f6; position:sticky; top:0; }
  table.ob td.num { text-align:right; font-variant-numeric:tabular-nums; }
  table.ob tr.win td { font-weight:700; color:#1a7f37; }
  table.ob tr.bad td { color:#8a8f96; }
</style>
</head>
<body>
<header>
  <h1>🔎 나라장터 IT 입찰공고 검색기</h1>
  <span class="sub">조달청 나라장터 입찰공고정보 · IT 소기업용</span>
  <div class="keybar">
    <span class="dot" id="keyDot"></span><span id="keyText">인증키 확인 중…</span>
    <button id="keyBtn">인증키 설정</button>
  </div>
</header>

<div class="tabs">
  <button id="tabSearch" class="active">🔎 입찰공고 검색</button>
  <button id="tabOpeng">📊 개찰결과 분석</button>
</div>

<div id="viewSearch">
<div class="panel">
  <div class="form-grid">
    <div class="field">
      <label>업무구분</label>
      <select id="business"><option selected>전체</option><option>용역</option><option>물품</option><option>공사</option><option>외자</option><option>기타</option></select>
    </div>
    <div class="field">
      <label>기간</label>
      <select id="period">
        <option value="today">오늘</option>
        <option value="3">최근 3일</option>
        <option value="7" selected>최근 7일</option>
        <option value="14">최근 14일</option>
        <option value="30">최근 1개월</option>
        <option value="90">최근 3개월</option>
        <option value="180">최근 6개월</option>
      </select>
    </div>
    <div class="field">
      <label>IT 키워드 (쉼표 구분, 비우면 기본세트)</label>
      <input id="keywords" class="kw" placeholder="예: AI, 시스템, 유지보수, 홈페이지">
    </div>
    <div class="field">
      <label>제외 키워드 (쉼표)</label>
      <input id="exclude" class="rg" style="width:160px" placeholder="예: 청소, 경비">
    </div>
    <div class="field">
      <label>예산 최소(만원)</label>
      <input id="minBudget" class="sm" type="number" placeholder="예: 1000">
    </div>
    <div class="field">
      <label>예산 최대(만원)</label>
      <input id="maxBudget" class="sm" type="number" placeholder="예: 20000">
    </div>
    <div class="field">
      <label>공동수급방식</label>
      <select id="spldmd">
        <option value="">전체</option>
        <option value="공500001">공동이행</option>
        <option value="공500002">분담이행</option>
        <option value="공500006">공동이행 또는 분담이행</option>
      </select>
    </div>
    <div class="field">
      <label>지역(선택)</label>
      <input id="region" class="rg" placeholder="예: 서울">
    </div>
    <div class="field">
      <label>마감 N일이내</label>
      <input id="deadlineDays" class="rg" type="number" placeholder="예: 7">
    </div>
    <button id="searchBtn">검색</button>
  </div>
</div>

<div class="toolbar" id="toolbar" style="display:none">
  <input type="search" id="q" placeholder="결과 내 공고명·기관 검색…">
  <select id="decFilter">
    <option value="">전체 판단</option>
    <option value="바로 검토">✅ 바로 검토</option>
    <option value="조건 확인 후 검토">🟡 조건 확인 후 검토</option>
    <option value="비추천">⛔ 비추천</option>
  </select>
  <button id="csvBtn" style="background:#1a7f37;color:#fff;border:none;padding:7px 14px;border-radius:6px;font-weight:600;cursor:pointer">📥 엑셀 다운로드</button>
  <span style="font-size:12px;color:#57606a">열 머리글 클릭 → 정렬 · 공고명 클릭 → 원문 · 다운로드는 현재 필터된 결과</span>
</div>

<div id="status">검색 조건을 입력하고 [검색]을 누르세요.</div>
<table id="t" style="display:none">
  <thead><tr>
    <th data-k="rank" data-type="num">순위</th>
    <th data-k="total" data-type="num">점수</th>
    <th data-k="decision" data-type="str">판단</th>
    <th data-k="itCategory" data-type="str">분류</th>
    <th data-k="title" data-type="str">공고명 / 추천이유</th>
    <th data-k="agencyName" data-type="str">기관</th>
    <th data-k="estimatedPrice" data-type="num">추정가격</th>
    <th data-k="closeDateTime" data-type="str">마감</th>
    <th data-k="contractMethod" data-type="str">계약방법</th>
    <th data-k="spldmd" data-type="str">공동수급</th>
    <th data-k="bidNo" data-type="str">공고번호</th>
  </tr></thead>
  <tbody></tbody>
</table>
</div><!-- /viewSearch -->

<div id="viewOpeng" style="display:none">
  <div class="panel">
    <div class="form-grid">
      <div class="field">
        <label>업무구분</label>
        <select id="oBusiness"><option selected>전체</option><option>용역</option><option>물품</option><option>공사</option><option>외자</option><option>기타</option></select>
      </div>
      <div class="field">
        <label>기간(공고게시 기준)</label>
        <select id="oPeriod">
          <option value="30">최근 1개월</option>
          <option value="90" selected>최근 3개월</option>
          <option value="180">최근 6개월</option>
          <option value="365">최근 1년</option>
        </select>
      </div>
      <div class="field">
        <label>검색어 (제품·공고명 / 또는 공고번호)</label>
        <input id="oKeywords" class="kw" placeholder="예: 보안성검증, AI  ·  공고번호: 20240516360">
      </div>
      <div class="field">
        <label>제외 키워드 (쉼표)</label>
        <input id="oExclude" style="width:160px" placeholder="예: 청소, 경비">
      </div>
      <div class="field">
        <label>지역(선택)</label>
        <input id="oRegion" class="rg" placeholder="예: 서울">
      </div>
      <button id="oSearchBtn" style="background:var(--blue);color:#fff;border:none;padding:10px 22px;border-radius:6px;font-size:15px;font-weight:700;cursor:pointer">검색</button>
    </div>
  </div>
  <div class="ohint">마감·개찰이 끝난 공고만 검색됩니다. 공고 행을 클릭하면 그 자리에서 <b>전체 투찰자 명단</b>(사업자등록번호·업체명·투찰금액 등)이 펼쳐집니다. · 검색어에 <b>공고번호</b>(예: 20240516360)를 넣으면 날짜와 무관하게 바로 조회합니다.</div>
  <div class="toolbar" id="oToolbar" style="display:none">
    <input type="search" id="oQ" placeholder="결과 내 공고명·기관 검색…">
    <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;white-space:nowrap">
      <input type="checkbox" id="oOnlyWith"> 투찰자 있는 공고만 보기
    </label>
    <span id="oScanInfo" style="font-size:12px;color:#57606a"></span>
    <span style="font-size:12px;color:#57606a">행 클릭 → 전체 투찰자 펼치기 · 출처: 나라장터 통합검색 상세화면</span>
  </div>
  <div id="oStatus">검색어를 입력하고 [검색]을 누르세요. (마감된 공고 대상)</div>
  <table id="ot" style="display:none">
    <thead><tr>
      <th style="width:30px"></th>
      <th data-k="title" data-type="str">공고명</th>
      <th data-k="agencyName" data-type="str">기관</th>
      <th data-k="closeDateTime" data-type="str">마감</th>
      <th data-k="opengDate" data-type="str">개찰일</th>
      <th data-k="bidNo" data-type="str">공고번호</th>
    </tr></thead>
    <tbody></tbody>
  </table>
</div><!-- /viewOpeng -->

<div class="footer">g2b-it-bid · 입찰공고 검색 점수는 휴리스틱 추정 · 개찰결과 전체명단은 나라장터 통합검색 화면 기반(비공식, 개편 시 변동 가능)</div>

<div class="modal" id="keyModal">
  <div class="box">
    <h2>인증키 설정</h2>
    <p>공공데이터포털(data.go.kr 15129394)에서 발급받은 <b>일반 인증키</b>를 입력하세요.
       Decoding 키(원본, % 없음)를 권장합니다. 키는 이 PC에만 저장됩니다.</p>
    <input id="keyInput" type="password" placeholder="발급받은 인증키 붙여넣기">
    <label style="font-size:13px"><input type="checkbox" id="encChk"> Encoding 키입니다 (% 포함)</label>
    <div class="err" id="keyErr"></div>
    <div class="row">
      <button id="keyCancel">취소</button>
      <button class="primary" id="keySave">저장</button>
    </div>
  </div>
</div>

<script>
const $ = (id) => document.getElementById(id);
let rows = [];

async function refreshKeyStatus() {
  try {
    const r = await fetch('/api/config'); const j = await r.json();
    $('keyDot').classList.toggle('on', j.hasKey);
    $('keyText').textContent = j.hasKey ? '인증키 설정됨' : '인증키 없음 — 먼저 설정하세요';
  } catch { $('keyText').textContent = '상태 확인 실패'; }
}
$('keyBtn').onclick = () => { $('keyModal').classList.add('show'); $('keyInput').focus(); };
$('keyCancel').onclick = () => $('keyModal').classList.remove('show');
$('keySave').onclick = async () => {
  const serviceKey = $('keyInput').value.trim();
  if (!serviceKey) { $('keyErr').textContent = '키를 입력하세요.'; return; }
  $('keyErr').textContent = '';
  const r = await fetch('/api/config', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ serviceKey, isEncoded: $('encChk').checked }) });
  if (r.ok) { $('keyModal').classList.remove('show'); $('keyInput').value=''; refreshKeyStatus(); }
  else { const j = await r.json().catch(()=>({})); $('keyErr').textContent = j.error || '저장 실패'; }
};

function badgeClass(d){ return d==='바로 검토'?'go':d==='조건 확인 후 검토'?'maybe':d==='비추천'?'no':'na'; }

function render(items, totalCount, meta) {
  rows = items;
  $('toolbar').style.display = items.length ? 'flex' : 'none';
  $('t').style.display = items.length ? '' : 'none';
  const note = meta && meta.truncated ? ' <span class="err">⚠️ 호출 한도 도달로 일부 기간/키워드가 생략됐습니다. 기간을 줄이거나 키워드를 좁혀보세요.</span>' : '';
  const calls = meta && meta.apiCalls ? ' · API '+meta.apiCalls+'회' : '';
  const capNote = meta && meta.capped ? ' <span class="err">(추천 상위 '+items.length+'건만 표시 / 매칭 '+totalCount+'건)</span>' : '';
  $('status').innerHTML = items.length
    ? '검색 결과 <b>'+items.length+'건</b>'+capNote+calls+note+' · 추천순 정렬'
    : '조건에 맞는 공고가 없습니다. 기간을 넓히거나 키워드를 바꿔보세요.'+note;
  const tb = $('t').querySelector('tbody');
  tb.innerHTML = items.map((it,i) => {
    const title = it.originalUrl ? '<a href="'+it.originalUrl+'" target="_blank" rel="noopener">'+esc(it.title)+'</a>' : esc(it.title);
    const reasons = it.reasons && it.reasons.length ? '💡 '+esc(it.reasons.join('; ')) : '';
    const risks = it.risks && it.risks.length ? '<div class="risk">⚠️ '+esc(it.risks.join('; '))+'</div>' : '';
    return '<tr class="'+badgeClass(it.decision)+'">'
      + '<td class="num">'+(i+1)+'</td>'
      + '<td class="num" data-v="'+it.total+'">'+it.total+'</td>'
      + '<td><span class="badge '+badgeClass(it.decision)+'">'+esc(it.decision)+'</span></td>'
      + '<td>'+esc(it.itCategory||'')+'</td>'
      + '<td class="title">'+title+'<div class="sub2">'+reasons+risks+'</div></td>'
      + '<td>'+esc(it.agencyName||it.demandOrgName||'')+'</td>'
      + '<td class="num" data-v="'+(it.estimatedPrice||0)+'">'+esc(it.priceShort||'확인 필요')+'</td>'
      + '<td data-v="'+esc(it.closeDateTime||'9999')+'">'+esc(it.closeDateTime||'확인 필요')+'<div class="sub2">'+esc(it.deadlineText||'')+'</div></td>'
      + '<td>'+esc(it.contractMethod||'')+'</td>'
      + '<td>'+esc(it.spldmd||'—')+'</td>'
      + '<td class="bidno">'+esc(it.bidNo||'')+'</td>'
      + '</tr>';
  }).join('');
  applyFilter();
}
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function applyFilter(){
  const term = $('q').value.trim().toLowerCase(); const d = $('decFilter').value;
  $('t').querySelectorAll('tbody tr').forEach(tr => {
    const okT = !term || tr.innerText.toLowerCase().includes(term);
    const okD = !d || tr.querySelector('.badge')?.textContent.trim()===d;
    tr.style.display = (okT&&okD)?'':'none';
  });
}
$('q').addEventListener('input', applyFilter);
$('decFilter').addEventListener('change', applyFilter);

// 엑셀(CSV) 다운로드 — 현재 필터된 결과
function exportCsv(){
  const term = $('q').value.trim().toLowerCase(), d = $('decFilter').value;
  const sel = rows.filter(it => {
    const text = (it.title+' '+(it.agencyName||'')+' '+(it.demandOrgName||'')).toLowerCase();
    return (!term || text.includes(term)) && (!d || it.decision===d);
  });
  if (!sel.length) { alert('다운로드할 결과가 없습니다.'); return; }
  const cols = [
    ['점수', it=>it.total], ['판단', it=>it.decision], ['분류', it=>it.itCategory||''],
    ['공고명', it=>it.title], ['발주기관', it=>it.agencyName||''], ['수요기관', it=>it.demandOrgName||''],
    ['추정가격(원)', it=>it.estimatedPrice||0], ['추정가격', it=>it.priceShort||''],
    ['입찰마감', it=>it.closeDateTime||''], ['남은시간', it=>it.deadlineText||''],
    ['계약방법', it=>it.contractMethod||''], ['공동수급', it=>it.spldmd||''],
    ['공고번호', it=>it.bidNo||''], ['원문URL', it=>it.originalUrl||''],
    ['추천이유', it=>(it.reasons||[]).join(' / ')], ['리스크', it=>(it.risks||[]).join(' / ')],
  ];
  const esc = v => '"' + String(v==null?'':v).replace(/"/g,'""') + '"';
  const header = cols.map(c=>esc(c[0])).join(',');
  const body = sel.map(it => cols.map(c=>esc(c[1](it))).join(',')).join('\\r\\n');
  const csv = '\\ufeff' + header + '\\r\\n' + body;  // UTF-8 BOM (엑셀 한글 깨짐 방지)
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0,10);
  a.download = '나라장터_IT입찰공고_'+today+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
$('csvBtn').addEventListener('click', exportCsv);

$('t').querySelectorAll('th').forEach((th, idx) => th.addEventListener('click', () => {
  const type = th.dataset.type; const asc = !th.classList.contains('asc');
  $('t').querySelectorAll('th').forEach(h=>h.classList.remove('asc','desc'));
  th.classList.add(asc?'asc':'desc');
  const tb = $('t').querySelector('tbody');
  Array.from(tb.querySelectorAll('tr')).sort((a,b)=>{
    let av=a.children[idx].dataset.v??a.children[idx].innerText, bv=b.children[idx].dataset.v??b.children[idx].innerText;
    if(type==='num'){av=parseFloat(av)||0;bv=parseFloat(bv)||0;return asc?av-bv:bv-av;}
    return asc?String(av).localeCompare(String(bv),'ko'):String(bv).localeCompare(String(av),'ko');
  }).forEach(tr=>tb.appendChild(tr));
}));

$('searchBtn').onclick = async () => {
  const p = new URLSearchParams();
  p.set('business', $('business').value);
  p.set('period', $('period').value);
  if ($('keywords').value.trim()) p.set('keywords', $('keywords').value.trim());
  if ($('exclude').value.trim()) p.set('excludeKeywords', $('exclude').value.trim());
  if ($('minBudget').value) p.set('minBudget', String(Number($('minBudget').value)*10000));
  if ($('maxBudget').value) p.set('maxBudget', String(Number($('maxBudget').value)*10000));
  if ($('region').value.trim()) p.set('region', $('region').value.trim());
  if ($('spldmd').value) p.set('spldmdCd', $('spldmd').value);
  if ($('deadlineDays').value) p.set('deadlineWithinDays', $('deadlineDays').value);
  $('searchBtn').disabled = true; $('status').textContent = '검색 중…';
  try {
    const r = await fetch('/api/search?'+p.toString());
    const j = await r.json();
    if (!j.ok) { $('status').innerHTML = '<span class="err">오류: '+esc(j.error||'알 수 없음')+'</span>'
      + (j.needKey ? ' — <a class="link" onclick="document.getElementById(\\'keyBtn\\').click()">인증키 설정하기</a>' : '');
      $('t').style.display='none'; $('toolbar').style.display='none'; return; }
    render(j.items, j.matchedBeforeFilter ?? j.totalCount, { apiCalls: j.apiCalls, truncated: j.truncated, capped: j.capped });
  } catch(e) { $('status').innerHTML = '<span class="err">요청 실패: '+esc(e.message)+'</span>'; }
  finally { $('searchBtn').disabled = false; }
};

// 입력칸에서 Enter → 검색 실행
['keywords','exclude','minBudget','maxBudget','region','deadlineDays'].forEach(id => {
  const el = $(id); if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('searchBtn').click(); } });
});

// ===== 모드 탭 전환 =====
$('tabSearch').onclick = () => switchMode('search');
$('tabOpeng').onclick  = () => switchMode('openg');
function switchMode(m){
  const isS = m==='search';
  $('viewSearch').style.display = isS ? '' : 'none';
  $('viewOpeng').style.display  = isS ? 'none' : '';
  $('tabSearch').classList.toggle('active', isS);
  $('tabOpeng').classList.toggle('active', !isS);
}

// ===== 개찰결과 분석 탭 =====
let oRows = [];
const oBidders = {}; // bidNo -> 캐시된 투찰자 응답
let oOnlyWith = false;      // "투찰자 있는 공고만 보기" 토글
const oState = {};          // bidNo-bidOrd -> 'has' | 'none' | 'pending' (미확정이면 키 없음)
let oScanRunning = false;   // 백그라운드 스캔 진행 여부

$('oSearchBtn').onclick = async () => {
  // 검색어가 공고번호(8자리 이상 숫자, 선택적으로 -차수)면 날짜 무관 직접 조회
  const kw = $('oKeywords').value.trim();
  const numForm = kw.replace(/[^0-9-]/g, '');
  if (/^\\d{8,}(-\\d{1,3})?$/.test(numForm)) { return directLookup(numForm); }

  const p = new URLSearchParams();
  p.set('business', $('oBusiness').value);
  p.set('period', $('oPeriod').value);
  p.set('closedOnly', '1');
  if ($('oKeywords').value.trim()) p.set('keywords', $('oKeywords').value.trim());
  if ($('oExclude').value.trim()) p.set('excludeKeywords', $('oExclude').value.trim());
  if ($('oRegion').value.trim()) p.set('region', $('oRegion').value.trim());
  $('oSearchBtn').disabled = true; $('oStatus').textContent = '검색 중…';
  try {
    const r = await fetch('/api/search?'+p.toString());
    const j = await r.json();
    if (!j.ok) { $('oStatus').innerHTML = '<span class="err">오류: '+esc(j.error||'알 수 없음')+'</span>'
      + (j.needKey ? ' — <a class="link" onclick="document.getElementById(\\'keyBtn\\').click()">인증키 설정하기</a>' : '');
      $('ot').style.display='none'; $('oToolbar').style.display='none'; return; }
    renderOpeng(j.items||[], j);
  } catch(e) { $('oStatus').innerHTML = '<span class="err">요청 실패: '+esc(e.message)+'</span>'; }
  finally { $('oSearchBtn').disabled = false; }
};

// 입력칸에서 Enter → 검색 실행
['oKeywords','oExclude','oRegion'].forEach(id => {
  const el = $(id); if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('oSearchBtn').click(); } });
});

// 공고번호 직접 조회 → 한 줄 결과 + 자동 펼침
function directLookup(raw){
  const [no, ordRaw] = raw.split('-');
  const bidNo = no, bidOrd = (ordRaw || '000').padStart(3,'0');
  oRows = [];
  $('oToolbar').style.display = 'none';
  $('ot').style.display = '';
  $('oStatus').innerHTML = '공고번호 <b>'+esc(bidNo)+'-'+esc(bidOrd)+'</b> 직접 조회 (날짜 무관)';
  const tb = $('ot').querySelector('tbody');
  tb.innerHTML = '<tr class="orow open" data-bidno="'+esc(bidNo)+'" data-bidord="'+esc(bidOrd)+'">'
    + '<td><span class="chev">▼</span></td>'
    + '<td class="title">공고번호 '+esc(bidNo)+'-'+esc(bidOrd)+'</td>'
    + '<td></td><td></td><td></td><td class="bidno">'+esc(bidNo)+'</td></tr>';
  expandRow(tb.querySelector('tr.orow'));
}

function renderOpeng(items, meta){
  oRows = items;
  $('oToolbar').style.display = items.length ? 'flex' : 'none';
  $('ot').style.display = items.length ? '' : 'none';
  const cap = meta && meta.capped ? ' (상위 '+items.length+'건 표시)' : '';
  $('oStatus').innerHTML = items.length
    ? '마감된 공고 <b>'+items.length+'건</b>'+cap+' · 행을 클릭해 전체 투찰자 명단을 확인하세요'
    : '조건에 맞는 마감 공고가 없습니다. 기간을 넓히거나 검색어를 바꿔보세요.';
  const tb = $('ot').querySelector('tbody');
  tb.innerHTML = items.map((it,i) =>
    '<tr class="orow" data-i="'+i+'" data-bidno="'+esc(it.bidNo||'')+'" data-bidord="'+esc(it.bidOrd||'000')+'">'
    + '<td><span class="chev">▶</span></td>'
    + '<td class="title">'+esc(it.title||'')+'</td>'
    + '<td>'+esc(it.agencyName||it.demandOrgName||'')+'</td>'
    + '<td>'+esc(it.closeDateTime||'')+'</td>'
    + '<td>'+esc(it.opengDate||'')+'</td>'
    + '<td class="bidno">'+esc(it.bidNo||'')+'</td>'
    + '</tr>'
  ).join('');
  for (const k in oState) delete oState[k]; // 새 검색마다 투찰자 판정 초기화
  applyOFilter();
  if (oOnlyWith) scanBidders();
}

function rowKey(tr){ return (tr.dataset.bidno||'') + '-' + (tr.dataset.bidord||'000'); }

function applyOFilter(){
  const term = $('oQ').value.trim().toLowerCase();
  $('ot').querySelectorAll('tbody tr.orow').forEach(tr => {
    const matchTerm = !term || tr.innerText.toLowerCase().includes(term);
    // 토글 ON 이면 '투찰자 없음'으로 확정된 행만 숨김(미확정은 스캔 끝날 때까지 노출)
    const matchBidders = !oOnlyWith || oState[rowKey(tr)] !== 'none';
    const ok = matchTerm && matchBidders;
    tr.style.display = ok ? '' : 'none';
    const d = tr.nextElementSibling;
    if (d && d.classList.contains('odetail')) d.style.display = (ok && tr.classList.contains('open')) ? '' : 'none';
  });
}
$('oQ').addEventListener('input', applyOFilter);

// ===== A: 개찰일 기준 싸게 거르기(스크래핑 0회) + B: 백그라운드 전수 확인 =====
function updateScanInfo(done, total, finished){
  if (!oOnlyWith) { $('oScanInfo').textContent = ''; return; }
  if (finished) {
    const shown = Array.from($('ot').querySelectorAll('tbody tr.orow')).filter(tr => tr.style.display !== 'none').length;
    $('oScanInfo').innerHTML = '투찰자 있는 공고만 표시 · <b>'+shown+'건</b>';
  } else {
    $('oScanInfo').textContent = '투찰자 확인 중… '+done+'/'+total;
  }
}

// A) 개찰일이 미래인 행 = 아직 개찰 전 → 스크래핑 없이 '없음' 확정
function cheapPrefilter(){
  const today = new Date(); today.setHours(0,0,0,0);
  $('ot').querySelectorAll('tbody tr.orow').forEach(tr => {
    const k = rowKey(tr);
    if (oState[k]) return;
    const i = tr.dataset.i;
    const it = (i != null && oRows[i]) ? oRows[i] : null;
    const od = it && it.opengDate ? it.opengDate : '';
    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(od)) {
      const d = new Date(od + 'T00:00:00');
      if (d.getTime() > today.getTime()) oState[k] = 'none';
    }
  });
}

// B) 미확정 행을 동시성 제한으로 전수 조회해 투찰자 유무 확정
async function scanBidders(){
  if (oScanRunning) return;
  oScanRunning = true;
  cheapPrefilter();
  applyOFilter();
  const queue = Array.from($('ot').querySelectorAll('tbody tr.orow')).filter(tr => !oState[rowKey(tr)]);
  const total = queue.length;
  let done = 0;
  updateScanInfo(0, total);
  if (total === 0) { oScanRunning = false; updateScanInfo(0, 0, true); return; }
  let idx = 0;
  const worker = async () => {
    while (oOnlyWith && idx < queue.length) {
      const tr = queue[idx++];
      const k = rowKey(tr);
      oState[k] = 'pending';
      try {
        let j = oBidders[k];
        if (!j) {
          const r = await fetch('/api/openg-bidders?'+new URLSearchParams({ bidNo: tr.dataset.bidno, bidOrd: tr.dataset.bidord||'000' }).toString());
          j = await r.json(); oBidders[k] = j;
        }
        oState[k] = (j && j.ok && j.bidders && j.bidders.length) ? 'has' : 'none';
      } catch(e) { oState[k] = 'none'; }
      done++;
      updateScanInfo(done, total);
      applyOFilter();
    }
  };
  const CONC = 6;
  await Promise.all(Array.from({ length: Math.min(CONC, total) }, worker));
  oScanRunning = false;
  if (oOnlyWith) updateScanInfo(total, total, true);
}

$('oOnlyWith').addEventListener('change', () => {
  oOnlyWith = $('oOnlyWith').checked;
  applyOFilter();
  if (oOnlyWith) scanBidders();
  else updateScanInfo(0, 0);
});

// 행 클릭 → 아코디언 토글
$('ot').addEventListener('click', (e) => {
  const tr = e.target.closest('tr.orow');
  if (!tr) return;
  const open = tr.classList.toggle('open');
  tr.querySelector('.chev').textContent = open ? '▼' : '▶';
  if (open) { expandRow(tr); }
  else { const d = tr.nextElementSibling; if (d && d.classList.contains('odetail')) d.style.display='none'; }
});

// 행의 전체 투찰자 명단을 불러와 아코디언에 표시
async function expandRow(tr){
  let detail = tr.nextElementSibling;
  if (!detail || !detail.classList.contains('odetail')) {
    detail = document.createElement('tr');
    detail.className = 'odetail';
    const td = document.createElement('td'); td.colSpan = 6; detail.appendChild(td);
    tr.parentNode.insertBefore(detail, tr.nextSibling);
  }
  detail.style.display='';
  const cell = detail.firstChild;
  const bidNo = tr.dataset.bidno, bidOrd = tr.dataset.bidord;
  cell.innerHTML = '<div class="obox">불러오는 중… (나라장터 조회)</div>';
  try {
    let j = oBidders[bidNo+'-'+bidOrd];
    if (!j) {
      const r = await fetch('/api/openg-bidders?'+new URLSearchParams({bidNo, bidOrd}).toString());
      j = await r.json(); oBidders[bidNo+'-'+bidOrd] = j;
    }
    if (!j.ok) { cell.innerHTML = '<div class="obox err">개찰결과 조회 실패: '+esc(j.error||'알 수 없음')+'</div>'; return; }
    oState[bidNo+'-'+bidOrd] = (j.bidders && j.bidders.length) ? 'has' : 'none';
    if (!j.bidders || !j.bidders.length) { cell.innerHTML = '<div class="obox">투찰자 정보가 없습니다(개찰 전이거나 미공개·유찰).</div>'; return; }
    cell.innerHTML = renderBidders(j);
    // 직접조회 행의 제목을 공고명으로 보강
    if (j.bidName) { const t = tr.querySelector('td.title'); if (t && /^공고번호/.test(t.textContent)) t.textContent = j.bidName; }
  } catch(err){ cell.innerHTML = '<div class="obox err">요청 실패: '+esc(err.message)+'</div>'; }
}

function renderBidders(j){
  const rows = j.bidders.map((b) => {
    const cls = b.remark && /부적격/.test(b.remark) ? ' class="bad"' : (b.rank===1 ? ' class="win"' : '');
    return '<tr'+cls+'>'
      + '<td class="num">'+(b.rank!=null?b.rank:'')+'</td>'
      + '<td>'+esc(b.bizno)+'</td>'
      + '<td>'+esc(b.companyName)+'</td>'
      + '<td>'+esc(b.ceoName)+'</td>'
      + '<td class="num">'+esc(b.bidAmountText)+'</td>'
      + '<td class="num">'+esc(b.bidRate)+'</td>'
      + '<td>'+esc(b.remark)+'</td>'
      + '<td>'+esc(b.bidDateTime)+'</td>'
      + '</tr>';
  }).join('');
  const meta = [];
  if (j.opengDateTime) meta.push('개찰 '+esc(j.opengDateTime));
  if (j.participantCount!=null) meta.push('참가 '+j.participantCount+'개사 (전원)');
  return '<div class="obox">'
    + '<button class="ocsv" onclick="exportBidders(\\''+esc(j.bidNo)+'\\',\\''+esc(j.bidOrd)+'\\')">📥 CSV</button>'
    + '<div class="ohead">'+esc(j.bidName||'')+(meta.length?' · '+meta.join(' · '):'')+'</div>'
    + '<table class="ob"><thead><tr><th>순위</th><th>사업자등록번호</th><th>업체명</th><th>대표자명</th><th>투찰금액</th><th>투찰률(%)</th><th>비고</th><th>투찰일시</th></tr></thead>'
    + '<tbody>'+rows+'</tbody></table></div>';
}

function exportBidders(bidNo, bidOrd){
  const j = oBidders[bidNo+'-'+bidOrd]; if (!j||!j.bidders) return;
  const cols = [
    ['순위', b=>b.rank!=null?b.rank:''], ['사업자등록번호', b=>b.bizno], ['업체명', b=>b.companyName],
    ['대표자명', b=>b.ceoName], ['투찰금액(원)', b=>b.bidAmount!=null?b.bidAmount:''], ['투찰률(%)', b=>b.bidRate],
    ['비고', b=>b.remark], ['투찰일시', b=>b.bidDateTime],
  ];
  const q = v => '"' + String(v==null?'':v).replace(/"/g,'""') + '"';
  const csv = '\\ufeff' + cols.map(c=>q(c[0])).join(',') + '\\r\\n'
    + j.bidders.map(b => cols.map(c=>q(c[1](b))).join(',')).join('\\r\\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = '개찰결과_전체투찰자_'+bidNo+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
}
window.exportBidders = exportBidders;

refreshKeyStatus();
</script>
</body>
</html>`
}
