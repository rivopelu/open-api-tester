import { pgTable, text } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { baseEntity, entityId } from '../../../../lib/base.entity'

export const ChatSessionEntity = pgTable('chat_sessions', {
  ...entityId,
  title: text('title'),
  ...baseEntity,
})

export type ChatSession = InferSelectModel<typeof ChatSessionEntity>
export type NewChatSession = InferInsertModel<typeof ChatSessionEntity>
