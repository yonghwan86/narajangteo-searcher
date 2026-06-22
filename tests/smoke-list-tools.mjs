// 스모크 테스트: 서버를 stdio로 기동하고 initialize + tools/list 를 보내 7개 도구 노출 확인 (인증키 불필요)
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(__dirname, "..", "build", "index.js")

const child = spawn(process.execPath, [serverPath], { stdio: ["pipe", "pipe", "inherit"] })

let buf = ""
const pending = new Map()
child.stdout.on("data", (d) => {
  buf += d.toString()
  let idx
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim()
    buf = buf.slice(idx + 1)
    if (!line) continue
    let msg
    try { msg = JSON.parse(line) } catch { continue }
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  }
})

function send(id, method, params) {
  return new Promise((resolve) => {
    pending.set(id, resolve)
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n")
  })
}

const fail = (m) => { console.error("SMOKE FAIL:", m); child.kill(); process.exit(1) }

try {
  const init = await send(1, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "smoke", version: "0" },
  })
  if (!init.result) fail("initialize 응답 없음")

  const list = await send(2, "tools/list", {})
  const tools = list.result?.tools ?? []
  const names = tools.map((t) => t.name)
  console.log("도구 수:", tools.length)
  console.log("도구 목록:", names.join(", "))

  const expected = [
    "search_it_bids", "get_bid_detail", "get_bid_opening_result", "recommend_bids_for_small_it_company",
    "create_bid_review_memo", "find_deadline_urgent_bids", "watch_keywords", "call_raw_operation",
  ]
  for (const e of expected) if (!names.includes(e)) fail(`누락된 도구: ${e}`)

  // 각 도구가 inputSchema(object)를 가지는지 확인
  for (const t of tools) {
    if (!t.inputSchema || t.inputSchema.type !== "object") fail(`${t.name} inputSchema 비정상`)
  }
  // call_raw_operation 의 operationName enum 길이 확인
  // (입찰공고정보서비스 25 + 낙찰정보서비스 개찰결과/낙찰자 8 = 33)
  const raw = tools.find((t) => t.name === "call_raw_operation")
  const enumLen = raw?.inputSchema?.properties?.operationName?.enum?.length
  console.log("call_raw_operation operationName enum 수:", enumLen)
  if (enumLen !== 33) fail(`오퍼레이션 enum 수가 33이 아님: ${enumLen}`)

  console.log(`SMOKE PASS: ${expected.length}개 도구 정상 노출 + 스키마 정상 (키 불필요)`)
  child.kill()
  process.exit(0)
} catch (e) {
  fail(e?.message ?? String(e))
}
