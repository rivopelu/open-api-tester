import type { z } from 'zod'

export type AssistantToolEventListener = (event: {
  type: 'tool_call_start' | 'tool_call_complete' | 'tool_call_error'
  toolId: string
  toolName: string
  args?: Record<string, unknown>
  resultSummary?: string
}) => void

export interface DomainToolContext {
  accountId?: string
  onEvent?: AssistantToolEventListener
}

export interface DomainToolDefinition<
  TSchema extends z.ZodRawShape = z.ZodRawShape,
  TResult = unknown,
> {
  name: string
  description: string
  inputSchema: z.ZodObject<TSchema>
  readOnly?: boolean
  destructive?: boolean
  execute: (input: any, ctx: DomainToolContext) => Promise<TResult>
  formatSummary?: (result: any, input: any) => string
}

export type AnyDomainToolDefinition = DomainToolDefinition<z.ZodRawShape, unknown>
