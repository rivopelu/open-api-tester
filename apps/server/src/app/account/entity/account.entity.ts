import { bigint, boolean, jsonb, pgTable, varchar } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { generateId } from '../../../lib/string-utils'

// Self-contained on purpose: base.entity references AccountEntity for the
// created_by FK, so importing baseEntity here would create a module cycle.
const entityId = {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(generateId),
}

const nowTimestamp = () => Date.now()

export const AccountEntity = pgTable('account', {
  ...entityId,
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  profile_picture: varchar('profile_picture', { length: 500 }),
  mcp_token: varchar('mcp_token', { length: 255 }),
  mcp_token_hash: varchar('mcp_token_hash', { length: 64 }).unique(),
  environments: jsonb('environments').$type<Array<{ id: string; name: string; variables: Record<string, string> }>>().default([]).notNull(),
  active_environment_id: varchar('active_environment_id', { length: 255 }),
  active: boolean('active').default(true).notNull(),
  created_date: bigint('created_date', { mode: 'number' }).$defaultFn(nowTimestamp).notNull(),
  created_by: varchar('created_by', { length: 256 }),
  updated_date: bigint('updated_date', { mode: 'number' }),
  updated_by: varchar('updated_by', { length: 256 }),
  deleted_date: bigint('deleted_date', { mode: 'number' }),
  deleted_by: varchar('deleted_by', { length: 256 }),
})

export type Account = InferSelectModel<typeof AccountEntity>
export type NewAccount = InferInsertModel<typeof AccountEntity>
