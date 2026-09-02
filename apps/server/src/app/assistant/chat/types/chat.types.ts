import { z } from 'zod'

export const AssistantContextSchema = z.object({
  pathname: z.string().optional(),
  projectId: z.string().optional(),
  endpointId: z.string().optional(),
  tab: z.string().optional(),
  exampleId: z.string().optional(),
  mentionedEndpointIds: z.array(z.string()).optional(),
})

export type AssistantContext = z.infer<typeof AssistantContextSchema>

export const ChatRequestSchema = z.object({
  message: z.string().trim().min(1),
  threadId: z.string().optional(),
  model: z.string().optional(),
  context: AssistantContextSchema.optional(),
})

export type ChatRequest = z.infer<typeof ChatRequestSchema>

export const ConfirmationResponseSchema = z.object({
  confirmationId: z.string().min(1),
  approved: z.boolean(),
})

export type ConfirmationResponse = z.infer<typeof ConfirmationResponseSchema>

export type ChatResult = {
  reply: string
  threadId: string
  sessionTitle?: string
}

export type AssistantUiEffectDto = {
  type: 'navigate' | 'highlight' | 'tab_change'
  projectId?: string
  endpointId?: string
  tab?: string
  exampleId?: string
  target?:
    'url' | 'summary' | 'method' | 'params' | 'headers' | 'body' | 'responses' | 'examples' | 'docs'
}

export type AssistantStreamEvent =
  | { type: 'token'; delta: string }
  | { type: 'tool_call_start'; toolId: string; toolName: string; args?: Record<string, unknown> }
  | { type: 'tool_call_complete'; toolId: string; toolName: string; resultSummary?: string }
  | { type: 'tool_call_error'; toolId: string; toolName: string; resultSummary?: string }
  | {
      type: 'tool_confirmation_request'
      confirmationId: string
      toolId: string
      toolName: string
      args: Record<string, unknown>
      summary: string
    }
  | { type: 'ui_effect'; effect: AssistantUiEffectDto }
  | { type: 'session_info'; threadId: string; sessionTitle?: string }
  | { type: 'done'; fullReply: string; threadId: string }
  | { type: 'error'; message: string }
