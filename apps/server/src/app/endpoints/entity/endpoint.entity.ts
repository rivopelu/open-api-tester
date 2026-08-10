import { boolean, integer, pgTable, text, varchar } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { HttpMethod } from '@modern-api-studio/types'
import { baseEntity, entityId } from '../../../lib/base.entity'
import { ProjectEntity } from '../../projects/entity/project.entity'

export const EndpointsEntity = pgTable('endpoints', {
  ...entityId,
  project_id: varchar('project_id', { length: 255 })
    .notNull()
    .references(() => ProjectEntity.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  method: varchar('method', { length: 12 }).$type<HttpMethod>().notNull(),
  summary: text('summary').notNull().default(''),
  description: text('description'),
  operation_id: text('operation_id'),
  deprecated: boolean('deprecated').notNull().default(false),
  sort_order: integer('sort_order').notNull().default(0),
  ...baseEntity,
})

export type EndpointRecord = InferSelectModel<typeof EndpointsEntity>
export type NewEndpointRecord = InferInsertModel<typeof EndpointsEntity>
