// 현재 출력 캡처용 — search_it_bids 결과 텍스트를 그대로 출력
import { G2bClient } from "../build/lib/g2bClient.js"
import { searchItBids } from "../build/tools/searchItBids.js"

const client = new G2bClient()
const res = await searchItBids(client, {
  businessType: "용역",
  includeNationwide: true,
  pageNo: 1,
  numOfRows: 100,
})
console.log("=== isError:", res.isError, "===")
console.log(res.content[0].text)
