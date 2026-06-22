// 중복 조회 원인 진단
import { G2bClient } from "../build/lib/g2bClient.js"
import { runItSearch } from "../build/lib/search-engine.js"
const client = new G2bClient()
const now = new Date()
const p = (n) => String(n).padStart(2, "0")
const fmt = (d) => `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`
const end = fmt(now), bgn = fmt(new Date(now.getTime() - 7 * 864e5))

const r = await runItSearch(client, { business: "전체", bgn, end })
console.log("총 bids:", r.bids.length)

// bidNo-bidOrd 키 중복 검사
const keyCount = new Map()
for (const b of r.bids) {
  const k = `${b.bidNo}-${b.bidOrd ?? ""}`
  keyCount.set(k, (keyCount.get(k) || 0) + 1)
}
const dups = [...keyCount.entries()].filter(([, c]) => c > 1)
console.log("bidNo-bidOrd 중복 키 수:", dups.length)
dups.slice(0, 5).forEach(([k, c]) => console.log("   중복:", k, "x", c))

// bidNo만으로 중복 (차수 다른 경우)
const noCount = new Map()
for (const b of r.bids) noCount.set(b.bidNo, (noCount.get(b.bidNo) || 0) + 1)
const noDups = [...noCount.entries()].filter(([, c]) => c > 1)
console.log("bidNo만 중복(차수 다를 수 있음):", noDups.length)
noDups.slice(0, 5).forEach(([no, c]) => {
  const recs = r.bids.filter((b) => b.bidNo === no)
  console.log(`   ${no} x${c}:`, recs.map((b) => `차수=${b.bidOrd}`).join(", "))
})
process.exit(0)
