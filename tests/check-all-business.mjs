// '전체' 업무구분 통합 조회 검증
import { startWebServer } from "../build/web/server.js"

const { port } = await startWebServer(7803)

async function run(business) {
  const j = await (await fetch(`http://localhost:${port}/api/search?business=${encodeURIComponent(business)}&period=today`)).json()
  return j
}

const total = await run("전체")
const servc = await run("용역")
console.log("전체:", { ok: total.ok, totalCount: total.totalCount, items: total.items?.length })
console.log("용역:", { ok: servc.ok, totalCount: servc.totalCount, items: servc.items?.length })

// 전체가 용역보다 많거나 같아야 정상 (여러 업무 합산)
if (total.ok && servc.ok) {
  console.log("전체 items >= 용역 items:", total.items.length >= servc.items.length)
  // 전체 결과에 용역 외 업무도 섞여있는지 (분류 다양성 간접 확인)
  const cats = new Set(total.items.map((it) => it.itCategory))
  console.log("전체 결과 IT카테고리 종류 수:", cats.size)
}
process.exit(0)
