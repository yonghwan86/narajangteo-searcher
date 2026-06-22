#!/usr/bin/env node

/**
 * g2b-it-bid 독립 실행 앱 진입점
 * 로컬 웹 서버를 띄우고 브라우저에 검색 UI를 연다.
 */

import "dotenv/config"
import { startWebServer, openUrl } from "./server.js"

async function main() {
  const { url } = await startWebServer(7777)
  // 콘솔(이 창)에는 안내만 출력
  process.stdout.write(`\n  나라장터 IT 입찰공고 검색기가 실행되었습니다.\n  주소: ${url}\n  (이 창을 닫으면 종료됩니다. 브라우저가 안 열리면 위 주소를 직접 입력하세요.)\n\n`)
  openUrl(url)
}

main().catch((e) => {
  process.stderr.write(`실행 오류: ${e instanceof Error ? e.message : String(e)}\n`)
  process.exit(1)
})
