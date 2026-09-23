import { createTool } from '@mastra/core/tools'
import { domainTools } from '../../app/assistant/tools/definitions/domain-tools'
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

/** Built once; per-request data (accountId) comes from the request context. */
export const assistantTools = Object.fromEntries(
  domainTools.map((toolDef) => [
    toolDef.name,
    createTool({
      id: toolDef.name,
      description: toolDef.description,
      inputSchema: toolDef.inputSchema,
      requireApproval: toolDef.requiresConfirmation ?? false,
      execute: async (input, { requestContext, writer }) => {
        const ctx = requestContext as
          | { get<K extends keyof AssistantRequestContext>(key: K): AssistantRequestContext[K] }
          | undefined
        return toolDef.execute((input ?? {}) as Record<string, unknown>, {
          accountId: ctx?.get('accountId'),
          onUiEffect: (effect: AssistantUiEffect) => {
            void writer?.custom({ type: UI_EFFECT_CHUNK, data: effect, transient: true })
          },
        })
      },
    }),
  ]),
)
