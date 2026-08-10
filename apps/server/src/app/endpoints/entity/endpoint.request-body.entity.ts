import { boolean, jsonb, pgTable, text, varchar } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { ContentType } from '@modern-api-studio/types'
import { baseEntity, entityId } from '../../../lib/base.entity'
import { EndpointsEntity } from './endpoint.entity'
import { ComponentSchemasEntity } from '../../projects/entity/component-schema.entity'

export const EndpointRequestBodiesEntity = pgTable('endpoint_request_bodies', {
  ...entityId,
  endpoint_id: varchar('endpoint_id', { length: 255 })
    .notNull()
    .unique()
    .references(() => EndpointsEntity.id, { onDelete: 'cascade' }),
  required: boolean('required').notNull().default(false),
  description: text('description'),
  content_type: varchar('content_type', { length: 100 })
    .$type<ContentType>()
    .notNull()
    .default('application/json'),
  mode: varchar('mode', { length: 16 }).$type<'visual' | 'raw' | 'ref'>(),
  schema_ref: varchar('schema_ref', { length: 255 }).references(() => ComponentSchemasEntity.id, {
    onDelete: 'set null',
  }),
  schema_data: jsonb('schema_data'),
  raw_json: text('raw_json'),
  ...baseEntity,
})

export type EndpointRequestBodyRecord = InferSelectModel<typeof EndpointRequestBodiesEntity>
export type NewEndpointRequestBodyRecord = InferInsertModel<typeof EndpointRequestBodiesEntity>
