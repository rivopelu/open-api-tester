import { createTool } from '@mastra/core/tools'
import { randomUUID } from 'node:crypto'
import { domainTools } from '../definitions/domain-tools'
import type {
  AssistantToolEventListener,
  ConfirmationRequestHandler,
  UiEffectEventListener,
} from '../types/tool.types'

export type { AssistantToolEventListener, ConfirmationRequestHandler, UiEffectEventListener }

export function createAssistantTools(
  onEvent?: AssistantToolEventListener,
  accountId?: string,
  requestConfirmation?: ConfirmationRequestHandler,
  onUiEffect?: UiEffectEventListener,
) {
  const toolsRecord: Record<string, ReturnType<typeof createTool>> = {}

  for (const toolDef of domainTools) {
    toolsRecord[toolDef.name] = createTool({
      id: toolDef.name,
      description: toolDef.description,
      inputSchema: toolDef.inputSchema,
      execute: async (input) => {
        const inputObj = (input ?? {}) as Record<string, unknown>

        // Human-in-the-loop confirmation check
        if (toolDef.requiresConfirmation && requestConfirmation) {
          const confirmationId = randomUUID()
          const confirmationSummary = toolDef.formatConfirmation
            ? toolDef.formatConfirmation(inputObj)
            : `Execute ${toolDef.name}`

          const approved = await requestConfirmation({
            confirmationId,
            toolId: toolDef.name,
            toolName: toolDef.name,
            args: inputObj,
            summary: confirmationSummary,
          })

          if (!approved) {
            const rejectMsg = `Aksi '${toolDef.name}' dibatalkan oleh pengguna.`
            onEvent?.({
              type: 'tool_call_error',
              toolId: toolDef.name,
              toolName: toolDef.name,
              resultSummary: 'Dibatalkan oleh pengguna',
            })
            return { cancelled: true, message: rejectMsg }
          }
        }

        onEvent?.({
          type: 'tool_call_start',
          toolId: toolDef.name,
          toolName: toolDef.name,
          args: inputObj,
        })

        try {
          const result = await toolDef.execute(inputObj, {
            accountId,
            onEvent,
            onUiEffect,
            requestConfirmation,
          })

          const summary = toolDef.formatSummary
            ? toolDef.formatSummary(result, inputObj)
            : undefined

          onEvent?.({
            type: 'tool_call_complete',
            toolId: toolDef.name,
            toolName: toolDef.name,
            resultSummary: summary,
          })

          return result
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Tool execution error'
          onEvent?.({
            type: 'tool_call_error',
            toolId: toolDef.name,
            toolName: toolDef.name,
            resultSummary: errMsg,
          })
          throw err
        }
      },
    })
  }

  return toolsRecord
}

export const assistantTools = createAssistantTools()
