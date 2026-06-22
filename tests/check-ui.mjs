import { renderUiPage } from "../build/web/ui.js"
const h = renderUiPage()
console.log("csvBtn 포함:", h.includes('id="csvBtn"'))
console.log("exportCsv 함수:", h.includes("function exportCsv"))
console.log("BOM 이스케이프(\\ufeff):", h.includes("'\\ufeff'"))
console.log("CRLF 이스케이프(\\r\\n):", h.includes("'\\r\\n'"))
console.log("공동수급 컬럼:", h.includes("공동수급"))
console.log("전체 옵션:", h.includes("<option>전체"))
console.log("6개월 옵션:", h.includes("최근 6개월"))
// 간단 JS 구문 점검: <script> 블록 추출해 new Function 으로 파싱(실행X)
const m = h.match(/<script>([\s\S]*?)<\/script>/)
try { new Function(m[1]); console.log("스크립트 구문: OK") }
catch (e) { console.log("스크립트 구문 오류:", e.message) }
