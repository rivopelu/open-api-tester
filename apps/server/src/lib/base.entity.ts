import { bigint, boolean, varchar } from 'drizzle-orm/pg-core'
import { generateId } from './string-utils'

export const generateEntityId = () => generateId()
export const nowTimestamp = () => Date.now()

export const entityId = {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(generateEntityId),
}

export const baseEntity = {
  active: boolean('active').default(true).notNull(),
  created_date: bigint('created_date', { mode: 'number' }).$defaultFn(nowTimestamp).notNull(),
  created_by: varchar('created_by', { length: 256 }),
  updated_date: bigint('updated_date', { mode: 'number' }),
  updated_by: varchar('updated_by', { length: 256 }),
  deleted_date: bigint('deleted_date', { mode: 'number' }),
  deleted_by: varchar('deleted_by', { length: 256 }),
}
