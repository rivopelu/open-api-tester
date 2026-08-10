import { integer, jsonb, pgTable, text, varchar } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { baseEntity, entityId } from '../../../lib/base.entity'
import { EndpointsEntity } from './endpoint.entity'
import { ComponentSchemasEntity } from '../../projects/entity/component-schema.entity'

export const EndpointResponsesEntity = pgTable('endpoint_responses', {
  ...entityId,
  endpoint_id: varchar('endpoint_id', { length: 255 })
    .notNull()
    .references(() => EndpointsEntity.id, { onDelete: 'cascade' }),
  status_code: text('status_code').notNull(),
  description: text('description').notNull().default(''),
  content_type: varchar('content_type', { length: 100 }),
  mode: varchar('mode', { length: 16 }).$type<'visual' | 'raw' | 'ref'>(),
  schema_ref: varchar('schema_ref', { length: 255 }).references(() => ComponentSchemasEntity.id, {
    onDelete: 'set null',
  }),
  schema_data: jsonb('schema_data'),
  raw_json: text('raw_json'),
  sort_order: integer('sort_order').notNull().default(0),
  ...baseEntity,
})

export type EndpointResponseRecord = InferSelectModel<typeof EndpointResponsesEntity>
export type NewEndpointResponseRecord = InferInsertModel<typeof EndpointResponsesEntity>
