import type { LiveEditOutcome, LiveEditPlan } from '@modern-api-studio/types'
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
  context: AssistantContextSchema.optional(),
})

export type ChatRequest = z.infer<typeof ChatRequestSchema>

export const ConfirmationResponseSchema = z.object({
  confirmationId: z.string().min(1),
  runId: z.string().min(1),
  threadId: z.string().min(1),
  approved: z.boolean(),
  context: AssistantContextSchema.optional(),
})

export const LiveEditResultSchema = z.object({
  runId: z.string().min(1),
  threadId: z.string().min(1),
  toolCallId: z.string().min(1),
  result: z.custom<LiveEditOutcome>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      ['saved', 'failed', 'fallback'].includes((value as { outcome?: string }).outcome ?? ''),
  ),
  context: AssistantContextSchema.optional(),
})

export type ConfirmationResponse = z.infer<typeof ConfirmationResponseSchema>

export type ChatResult = {
  reply: string
  threadId: string
  sessionTitle?: string
}

export type ChatSessionDto = {
  id: string
  title: string | null
  created_by?: string | null
  created_date: number
  updated_date?: number | null
}

export type ChatMessageDto = {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_date: number
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
      runId: string
      threadId: string
      toolId: string
      toolName: string
      args: Record<string, unknown>
      summary: string
    }
  | { type: 'ui_effect'; effect: AssistantUiEffectDto }
  | {
      type: 'live_edit'
      runId: string
      threadId: string
      toolCallId: string
      plan: LiveEditPlan
    }
  | { type: 'session_info'; threadId: string; sessionTitle?: string }
  | { type: 'done'; fullReply: string; threadId: string }
  | { type: 'error'; message: string }
