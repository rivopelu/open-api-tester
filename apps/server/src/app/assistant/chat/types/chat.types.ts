import { z } from 'zod'

export const AssistantContextSchema = z.object({
  pathname: z.string().optional(),
  projectId: z.string().optional(),
  endpointId: z.string().optional(),
  tab: z.string().optional(),
  exampleId: z.string().optional(),
})

export type AssistantContext = z.infer<typeof AssistantContextSchema>

export const ChatRequestSchema = z.object({
  message: z.string().trim().min(1),
  threadId: z.string().optional(),
  model: z.string().optional(),
  context: AssistantContextSchema.optional(),
})

export type ChatRequest = z.infer<typeof ChatRequestSchema>

export type ChatResult = {
  reply: string
  threadId: string
  sessionTitle?: string
}

export type AssistantStreamEvent =
  | { type: 'token'; delta: string }
  | { type: 'tool_call_start'; toolId: string; toolName: string; args?: Record<string, unknown> }
  | { type: 'tool_call_complete'; toolId: string; toolName: string; resultSummary?: string }
  | { type: 'tool_call_error'; toolId: string; toolName: string; resultSummary?: string }
  | { type: 'session_info'; threadId: string; sessionTitle?: string }
  | { type: 'done'; fullReply: string; threadId: string }
  | { type: 'error'; message: string }
