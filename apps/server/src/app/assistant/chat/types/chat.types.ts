import { z } from 'zod'

export const ChatRequestSchema = z.object({
  message: z.string().trim().min(1),
  threadId: z.string().optional(),
})

export type ChatRequest = z.infer<typeof ChatRequestSchema>

export type ChatResult = {
  reply: string
  threadId: string
}
