import { jsonb, pgTable, text } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { baseEntity, entityId } from '../../../lib/base.entity'

export const ProjectEntity = pgTable('projects', {
  ...entityId,
  name: text('name').notNull().default('Untitled Project'),
  spec_data: jsonb('spec_data').notNull().default({}).$type<Record<string, unknown>>(),
  ...baseEntity,
})

export type Project = InferSelectModel<typeof ProjectEntity>
export type NewProject = InferInsertModel<typeof ProjectEntity>