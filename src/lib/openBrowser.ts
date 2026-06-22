/**
 * HTML 리포트를 임시 파일로 저장하고 OS 기본 브라우저로 연다.
 * 로컬(stdio) 실행 환경 전용 편의 기능.
 */

import { writeFile, mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"

/** 파일명에 안전한 타임스탬프 (YYYYMMDD-HHmmss) */
function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

/** OS 기본 앱으로 경로/URL 열기 */
function openPath(target: string): void {
  const platform = process.platform
  try {
    if (platform === "win32") {
      // start 는 cmd 내장 명령. 첫 따옴표 인자는 창 제목으로 소비되므로 "" 더미 필요.
      spawn("cmd", ["/c", "start", "", target], { detached: true, stdio: "ignore" }).unref()
    } else if (platform === "darwin") {
      spawn("open", [target], { detached: true, stdio: "ignore" }).unref()
    } else {
      spawn("xdg-open", [target], { detached: true, stdio: "ignore" }).unref()
    }
  } catch {
    /* 열기 실패는 무시 — 파일 경로는 호출측에서 안내 */
  }
}

export interface OpenReportResult {
  filePath: string
  opened: boolean
}

/**
 * HTML 내용을 임시 파일로 쓰고 브라우저로 연다.
 * @returns 저장된 파일 경로
 */
export async function openHtmlReport(html: string, nameHint = "report"): Promise<OpenReportResult> {
  const dir = path.join(tmpdir(), "g2b-it-bid-mcp")
  await mkdir(dir, { recursive: true })
  const safeHint = nameHint.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || "report"
  const filePath = path.join(dir, `${safeHint}-${stamp()}.html`)
  await writeFile(filePath, html, "utf8")
  openPath(filePath)
  return { filePath, opened: true }
}
