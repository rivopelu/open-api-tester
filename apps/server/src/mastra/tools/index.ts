import { createTool } from '@mastra/core/tools'
import type { LiveEditOutcome, LiveEditPlan } from '@modern-api-studio/types'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { domainTools, persistLivePatch } from '../../app/assistant/tools/definitions/domain-tools'
import type { AssistantUiEffect } from '../../app/assistant/tools/types/tool.types'
import type { AssistantRequestContext } from '../request-context'

export const UI_EFFECT_CHUNK = 'data-ui-effect'

export function formatToolErrorMessage(err: unknown): string {
  if (!err) return 'Tool execution error'
  const rawMsg = err instanceof Error ? err.message : String(err)

  // Handle Drizzle / Postgres Query Errors
  if (rawMsg.includes('Failed query:')) {
    if (/duplicate key|unique constraint/i.test(rawMsg)) {
      return 'Data duplikat: data dengan nama atau identitas tersebut sudah ada.'
    }
    if (/foreign key constraint|violates foreign key/i.test(rawMsg)) {
      return 'Relasi tidak ditemukan atau referensi project/folder tidak valid.'
    }
    if (/null value in column/i.test(rawMsg)) {
      const match = rawMsg.match(/column "([^"]+)"/i)
      return `Kolom wajib belum terisi: ${match ? match[1] : 'field'}`
    }
    return 'Gagal memproses data ke database. Periksa parameter yang diberikan.'
  }

  const firstLine = rawMsg.split('\n')[0].trim()
  return firstLine.length > 100 ? `${firstLine.slice(0, 97)}…` : firstLine
}

export const domainToolsByName = new Map(domainTools.map((def) => [def.name, def]))

export function formatToolSummary(toolName: string, result: unknown, args: unknown) {
  const def = domainToolsByName.get(toolName)
  return def?.formatSummary ? def.formatSummary(result, args ?? {}) : undefined
}

export function formatToolConfirmation(toolName: string, args: Record<string, unknown>) {
  const def = domainToolsByName.get(toolName)
  return def?.formatConfirmation ? def.formatConfirmation(args) : `Execute ${toolName}`
}

type ContextReader = { get(key: string): unknown } | undefined

/**
 * Agent runs set `accountId` on the request context; MCP requests carry it in
 * `authInfo.extra` (set by the /mcp route after token auth).
 */
function resolveAccountId(requestContext: ContextReader): string | undefined {
  const fromAgent = requestContext?.get('accountId' satisfies keyof AssistantRequestContext)
  if (typeof fromAgent === 'string') return fromAgent
  const authInfo = requestContext?.get('authInfo') as
    { extra?: { accountId?: unknown } } | undefined
  return typeof authInfo?.extra?.accountId === 'string' ? authInfo.extra.accountId : undefined
}

const liveEditSuspendSchema = z.object({ plan: z.custom<LiveEditPlan>() })
const liveEditResumeSchema = z.custom<LiveEditOutcome>(
  (value) => typeof (value as { outcome?: unknown })?.outcome === 'string',
)

/**
 * Built once; per-request data (accountId, liveEdit) comes from the request context.
 *
 * Live edit (chat only): instead of persisting, a tool with `planLiveEdit` suspends with its plan,
 * which is streamed to the client. The client types it into the form, saves it, and resumes the run
 * with a `LiveEditOutcome`. MCP and non-streaming chat never set `liveEdit`, so they persist directly.
 */
export const assistantTools = Object.fromEntries(
  domainTools.map((toolDef) => [
    toolDef.name,
    createTool({
      id: toolDef.name,
      description: toolDef.description,
      inputSchema: toolDef.inputSchema,
      requireApproval: toolDef.requiresConfirmation ?? false,
      ...(toolDef.planLiveEdit
        ? { suspendSchema: liveEditSuspendSchema, resumeSchema: liveEditResumeSchema }
        : {}),
      mcp: {
        annotations: { readOnlyHint: toolDef.readOnly, destructiveHint: toolDef.destructive },
      },
      execute: async (input, { requestContext, writer, agent }) => {
        const args = (input ?? {}) as Record<string, unknown>
        const ctx = {
          accountId: resolveAccountId(requestContext),
          onUiEffect: (effect: AssistantUiEffect) => {
            void writer?.custom({ type: UI_EFFECT_CHUNK, data: effect, transient: true })
          },
        }

        // Agent runs expose suspend/resume under `agent`; MCP calls have no agent context.
        const live = requestContext?.get('liveEdit') === true && toolDef.planLiveEdit && agent
        if (!live) return toolDef.execute(args, ctx)

        const outcome = agent.resumeData as LiveEditOutcome | undefined
        if (outcome) {
          const plan = (agent.suspendPayload as { plan?: LiveEditPlan } | undefined)?.plan
          if (outcome.outcome === 'saved') return { ...outcome.endpoint, liveEdit: 'saved' }
          if (outcome.outcome === 'failed') throw new Error(outcome.error)
          return plan ? persistLivePatch(plan.endpointId, plan.patch) : toolDef.execute(args, ctx)
        }

        const plan: LiveEditPlan = {
          ...(await toolDef.planLiveEdit!(args, ctx)),
          editId: randomUUID(),
          tool: toolDef.name,
        }
        // Surfaces as a `tool-call-suspended` chunk carrying the plan (mapped to SSE `live_edit`).
        await agent.suspend({ plan })
        return undefined
      },
    }),
  ]),
)
