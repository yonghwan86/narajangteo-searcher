// 스모크: 인증키 없이 도구 호출 시 한국어 NO_API_KEY 오류를 깔끔히 반환하는지 확인
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(__dirname, "..", "build", "index.js")

// 키 환경변수를 비워서 기동
const env = { ...process.env }
delete env.NARAJANGTEO_SERVICE_KEY

const child = spawn(process.execPath, [serverPath], { stdio: ["pipe", "pipe", "inherit"], env })
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
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  }
})
function send(id, method, params) {
  return new Promise((resolve) => { pending.set(id, resolve); child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n") })
}
const fail = (m) => { console.error("SMOKE FAIL:", m); child.kill(); process.exit(1) }

await send(1, "initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "smoke", version: "0" } })
const res = await send(2, "tools/call", { name: "search_it_bids", arguments: {} })
const text = res.result?.content?.[0]?.text ?? ""
console.log("응답:", text.split("\n")[0])
if (res.result?.isError !== true) fail("isError 가 true 가 아님")
if (!text.includes("NO_API_KEY") && !text.includes("인증키")) fail("인증키 오류 메시지가 아님")
if (/serviceKey=|NARAJANGTEO_SERVICE_KEY=[^\s]/.test(text)) fail("키 값이 노출됨")
console.log("SMOKE PASS: 키 없이 호출 시 한국어 인증키 오류 정상 반환 (크래시 없음, 키 비노출)")
child.kill()
process.exit(0)
