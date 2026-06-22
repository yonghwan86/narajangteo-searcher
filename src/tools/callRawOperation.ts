/**
 * call_raw_operation — 25개 오퍼레이션 직접 호출 (검증/확장/디버깅용)
 */

import { z } from "zod"
import type { G2bClient } from "../lib/g2bClient.js"
import type { LooseToolResponse } from "../lib/types.js"
import { formatToolError, G2bApiError, ErrorCodes } from "../lib/errors.js"
import { OPERATIONS, OPERATION_MAP } from "../lib/operations.js"
import { truncateResponse } from "../lib/schemas.js"

const OPERATION_NAMES = OPERATIONS.map((op) => op.name) as [string, ...string[]]

export const CallRawOperationSchema = z.object({
  operationName: z.enum(OPERATION_NAMES).describe("호출할 오퍼레이션 영문명"),
  params: z
    .record(z.string(), z.union([z.string(), z.number()]))
    .optional()
    .describe("요청 파라미터 (serviceKey/type 은 자동 주입). 예: { inqryDiv:'2', bidNtceNo:'R25BK00932003' }"),
})

export type CallRawOperationInput = z.infer<typeof CallRawOperationSchema>

export async function callRawOperation(client: G2bClient, input: CallRawOperationInput): Promise<LooseToolResponse> {
  try {
    const spec = OPERATION_MAP.get(input.operationName)
    if (!spec) {
      throw new G2bApiError(`알 수 없는 오퍼레이션: ${input.operationName}`, ErrorCodes.INVALID_PARAM)
    }

    const params: Record<string, string | number> = { numOfRows: 10, pageNo: 1, ...(input.params ?? {}) }
    const res = await client.callOperation(input.operationName, params)

    const summary = {
      operation: input.operationName,
      korNm: spec.korNm,
      resultCode: res.resultCode,
      resultMsg: res.resultMsg,
      totalCount: res.totalCount,
      pageNo: res.pageNo,
      numOfRows: res.numOfRows,
      itemCount: res.items.length,
      items: res.items,
    }

    const text = `# ${spec.korNm} (${input.operationName})\n\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\``
    return { content: [{ type: "text", text: truncateResponse(text) }] }
  } catch (error) {
    return formatToolError(error, "call_raw_operation")
  }
}
