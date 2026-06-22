/**
 * 독립 앱용 설정 저장소 — 인증키를 사용자 폴더의 config.json 에 저장/로드.
 * (MCP는 환경변수 기반이지만, 독립 앱은 비개발자가 UI에서 키를 입력·저장할 수 있어야 한다.)
 *
 * 저장 위치: %APPDATA%/g2b-it-bid/config.json (Windows) 또는 ~/.g2b-it-bid/config.json
 * 로드 시 process.env 에 주입하므로 g2bClient(config.ts)는 그대로 동작한다.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import os from "node:os"

export interface AppConfig {
  serviceKey?: string
  isEncoded?: boolean
}

function configDir(): string {
  const base = process.env.APPDATA || path.join(os.homedir(), ".config")
  return path.join(base, "g2b-it-bid")
}

export function configFilePath(): string {
  return path.join(configDir(), "config.json")
}

export function loadConfig(): AppConfig {
  try {
    const raw = readFileSync(configFilePath(), "utf8")
    return JSON.parse(raw) as AppConfig
  } catch {
    return {}
  }
}

export function saveConfig(cfg: AppConfig): void {
  mkdirSync(configDir(), { recursive: true })
  writeFileSync(configFilePath(), JSON.stringify(cfg, null, 2), "utf8")
  applyToEnv(cfg)
}

/** 설정을 process.env 에 주입 (g2bClient가 환경변수를 읽으므로) */
export function applyToEnv(cfg: AppConfig): void {
  if (cfg.serviceKey !== undefined) process.env.NARAJANGTEO_SERVICE_KEY = cfg.serviceKey
  if (cfg.isEncoded !== undefined) process.env.NARAJANGTEO_SERVICE_KEY_IS_ENCODED = String(cfg.isEncoded)
}

/** 키 설정 여부 (값 노출 없이) */
export function hasServiceKey(): boolean {
  const k = process.env.NARAJANGTEO_SERVICE_KEY || ""
  return k.trim() !== "" && !k.includes("여기에")
}
