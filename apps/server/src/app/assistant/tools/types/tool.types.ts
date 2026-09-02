import type { z } from 'zod'

export type AssistantToolEventListener = (event: {
  type: 'tool_call_start' | 'tool_call_complete' | 'tool_call_error'
  toolId: string
  toolName: string
  args?: Record<string, unknown>
  resultSummary?: string
}) => void

export interface ConfirmationRequest {
  confirmationId: string
  toolId: string
  toolName: string
  args: Record<string, unknown>
  summary: string
}

export type ConfirmationRequestHandler = (request: ConfirmationRequest) => Promise<boolean>

export interface AssistantUiEffect {
  type: 'navigate' | 'highlight' | 'tab_change'
  projectId?: string
  endpointId?: string
  tab?: string
  exampleId?: string
  target?:
    'url' | 'summary' | 'method' | 'params' | 'headers' | 'body' | 'responses' | 'examples' | 'docs'
}

export type UiEffectEventListener = (effect: AssistantUiEffect) => void

export interface DomainToolContext {
  accountId?: string
  onEvent?: AssistantToolEventListener
  onUiEffect?: UiEffectEventListener
  requestConfirmation?: ConfirmationRequestHandler
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
  requiresConfirmation?: boolean
  execute: (input: any, ctx: DomainToolContext) => Promise<TResult>
  formatSummary?: (result: any, input: any) => string
  formatConfirmation?: (input: any) => string
}

export type AnyDomainToolDefinition = DomainToolDefinition<z.ZodRawShape, unknown>
