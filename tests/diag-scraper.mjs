import { fetchAllBidders } from "../build/lib/openg-scraper.js"
const bidNo = process.argv[2] || "20240516360"
const r = await fetchAllBidders(bidNo, process.argv[3] || "000")
console.log("공고:", r.bidName, "| 개찰:", r.opengDateTime, "| 참가:", r.participantCount, "| 수신:", r.bidders.length, "| source:", r.source)
for (const b of r.bidders.slice(0, 12)) console.log(" ", b.rank ?? "-", "|", b.bizno, "|", b.companyName, "|", b.ceoName, "|", b.bidAmount, "|", b.bidRate || "-", "|", b.remark, "|", b.bidDateTime)
if (r.bidders.length > 12) console.log("  ...외", r.bidders.length - 12, "건")
