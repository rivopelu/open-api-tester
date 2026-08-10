import { pgTable, varchar } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { baseEntity, entityId } from '../../../lib/base.entity'

export const AccountEntity = pgTable('account', {
  ...entityId,
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  profile_picture: varchar('profile_picture', { length: 500 }),
  ...baseEntity,
})

export type Account = InferSelectModel<typeof AccountEntity>
export type NewAccount = InferInsertModel<typeof AccountEntity>
