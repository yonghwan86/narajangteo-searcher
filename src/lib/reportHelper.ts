/**
 * 검색 결과를 HTML 리포트로 만들어 브라우저로 열고, 결과 안내 문구를 돌려주는 공용 헬퍼.
 * 실패해도 도구 본체에 영향을 주지 않도록 안전하게 처리한다.
 */

import { buildHtmlReport, type ReportItem } from "./htmlReport.js"
import { openHtmlReport } from "./openBrowser.js"

/**
 * @returns 응답 본문 위에 덧붙일 안내 마크다운(성공/실패 모두 한 줄). 열기 자체가 불가하면 빈 문자열.
 */
export async function openReportSafe(
  title: string,
  items: ReportItem[],
  nameHint: string,
  totalCount?: number
): Promise<string> {
  try {
    const html = buildHtmlReport(title, items, {
      totalCount,
      generatedAt: new Date().toLocaleString("ko-KR"),
    })
    const { filePath } = await openHtmlReport(html, nameHint)
    return `🖥️ **결과를 브라우저 창에 띄웠습니다.** (정렬·필터·원문링크 가능)\n파일: ${filePath}\n`
  } catch (e) {
    return `⚠️ 브라우저 창 열기에 실패했습니다(${e instanceof Error ? e.message : String(e)}). 아래 텍스트 결과를 참고하세요.\n`
  }
}
