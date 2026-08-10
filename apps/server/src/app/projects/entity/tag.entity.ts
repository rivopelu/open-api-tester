import { pgTable, text, varchar } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { baseEntity, entityId } from '../../../lib/base.entity'
import { ProjectEntity } from './project.entity'

export const TagEntity = pgTable('tags', {
  ...entityId,
  project_id: varchar('project_id', { length: 255 })
    .notNull()
    .references(() => ProjectEntity.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  ...baseEntity,
})

export type TagRecord = InferSelectModel<typeof TagEntity>
export type NewTagRecord = InferInsertModel<typeof TagEntity>
