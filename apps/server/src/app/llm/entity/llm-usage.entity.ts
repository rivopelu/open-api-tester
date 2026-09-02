import { bigint, integer, pgTable, text, varchar } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { entityId, nowTimestamp } from '../../../lib/base.entity'
import { AccountEntity } from '../../account/entity/account.entity'

export const LlmUsageEntity = pgTable('llm_usage', {
  ...entityId,
  account_id: varchar('account_id', { length: 255 }).references(() => AccountEntity.id, {
    onDelete: 'set null',
  }),
  thread_id: varchar('thread_id', { length: 255 }),
  model: varchar('model', { length: 128 }).notNull(),
  prompt_tokens: integer('prompt_tokens').notNull().default(0),
  completion_tokens: integer('completion_tokens').notNull().default(0),
  total_tokens: integer('total_tokens').notNull().default(0),
  message: text('message'),
  created_date: bigint('created_date', { mode: 'number' }).$defaultFn(nowTimestamp).notNull(),
})

export type LlmUsage = InferSelectModel<typeof LlmUsageEntity>
export type NewLlmUsage = InferInsertModel<typeof LlmUsageEntity>
