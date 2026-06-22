// 단일 실행 파일(.exe) 빌드 — esbuild 번들(CJS) + Node SEA
// 산출물: dist-exe/나라장터-IT입찰공고-검색기.exe (Node 내장, 더블클릭 실행)
import { build } from "esbuild"
import { execFileSync } from "node:child_process"
import { mkdirSync, copyFileSync, writeFileSync, existsSync, rmSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(fileURLToPath(import.meta.url)).replace(/scripts$/, "")
const outDir = path.join(root, "dist-exe")
const bundlePath = path.join(outDir, "app.cjs")
const blobPath = path.join(outDir, "sea-prep.blob")
const seaConfigPath = path.join(outDir, "sea-config.json")
const exeName = "나라장터-IT입찰공고-검색기.exe"
const exePath = path.join(outDir, exeName)

if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

console.log("1/5 esbuild 번들링(CJS)…")
await build({
  entryPoints: [path.join(root, "src", "web", "index.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  outfile: bundlePath,
  // dotenv/config 부작용 import 유지
  banner: { js: "/* g2b-it-bid standalone */" },
})

console.log("2/5 SEA config 작성…")
writeFileSync(
  seaConfigPath,
  JSON.stringify({ main: bundlePath, output: blobPath, disableExperimentalSEAWarning: true }, null, 2)
)

console.log("3/5 SEA blob 생성…")
execFileSync(process.execPath, ["--experimental-sea-config", seaConfigPath], { stdio: "inherit" })

console.log("4/5 node.exe 복사…")
copyFileSync(process.execPath, exePath)

console.log("5/5 blob 주입(postject)…")
execFileSync(
  process.execPath,
  [
    path.join(root, "node_modules", "postject", "dist", "cli.js"),
    exePath,
    "NODE_SEA_BLOB",
    blobPath,
    "--sentinel-fuse",
    "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
  ],
  { stdio: "inherit" }
)

console.log(`\n완료: ${exePath}`)
