#!/usr/bin/env node

/**
 * g2b-it-bid-mcp
 * 조달청 나라장터 입찰공고정보서비스 기반 IT 소기업용 MCP 서버
 */

import "dotenv/config"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { G2bClient } from "./lib/g2bClient.js"
import { registerTools } from "./tool-registry.js"

const SERVER_NAME = "g2b-it-bid"
const SERVER_VERSION = "0.1.0"

function createServer(): Server {
  const server = new Server({ name: SERVER_NAME, version: SERVER_VERSION }, { capabilities: { tools: {} } })
  const client = new G2bClient()
  registerTools(server, client)
  return server
}

async function main(): Promise<void> {
  // stdout 오염 방지: MCP JSON-RPC 프로토콜은 stdout 을 사용하므로 로그는 stderr 로 보낸다.
  const stderrWrite = (...args: unknown[]) => process.stderr.write(args.map(String).join(" ") + "\n")
  console.log = console.warn = console.info = console.debug = stderrWrite

  const server = createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  process.stderr.write(`Server error: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
