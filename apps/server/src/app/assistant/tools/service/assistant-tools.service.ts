import { createTool } from '@mastra/core/tools'
import { domainTools } from '../definitions/domain-tools'
import type { AssistantToolEventListener } from '../types/tool.types'

export type { AssistantToolEventListener }

export function createAssistantTools(
  onEvent?: AssistantToolEventListener,
  accountId?: string,
) {
  const toolsRecord: Record<string, ReturnType<typeof createTool>> = {}

  for (const toolDef of domainTools) {
    toolsRecord[toolDef.name] = createTool({
      id: toolDef.name,
      description: toolDef.description,
      inputSchema: toolDef.inputSchema,
      execute: async (input) => {
        const inputObj = (input ?? {}) as Record<string, unknown>
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
