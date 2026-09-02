import { bigint, pgTable, text, varchar } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { entityId, nowTimestamp } from '../../../../lib/base.entity'
import { ChatSessionEntity } from './chat-session.entity'

export type ChatMessageRole = 'system' | 'user' | 'assistant' | 'tool'

export const ChatMessageEntity = pgTable('chat_messages', {
  ...entityId,
  session_id: varchar('session_id', { length: 255 })
    .notNull()
    .references(() => ChatSessionEntity.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 16 }).notNull().$type<ChatMessageRole>(),
  content: text('content').notNull(),
  created_date: bigint('created_date', { mode: 'number' }).$defaultFn(nowTimestamp).notNull(),
})

export type ChatMessage = InferSelectModel<typeof ChatMessageEntity>
export type NewChatMessage = InferInsertModel<typeof ChatMessageEntity>
