import { boolean, integer, jsonb, pgTable, text, varchar } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { baseEntity, entityId } from '../../../lib/base.entity'
import { ProjectEntity } from './project.entity'

export const EnvironmentsEntity = pgTable('environments', {
  ...entityId,
  project_id: varchar('project_id', { length: 255 })
    .notNull()
    .references(() => ProjectEntity.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  base_url: text('base_url').notNull().default(''),
  variables: jsonb('variables').$type<Record<string, unknown>>().default({}),
  is_active: boolean('is_active').notNull().default(false),
  sort_order: integer('sort_order').notNull().default(0),
  ...baseEntity,
})

export type EnvironmentRecord = InferSelectModel<typeof EnvironmentsEntity>
export type NewEnvironmentRecord = InferInsertModel<typeof EnvironmentsEntity>
