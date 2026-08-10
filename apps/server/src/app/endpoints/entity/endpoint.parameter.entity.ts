import { boolean, integer, jsonb, pgTable, text, varchar } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { ParameterLocation, SchemaType } from '@modern-api-studio/types'
import { baseEntity, entityId } from '../../../lib/base.entity'
import { EndpointsEntity } from './endpoint.entity'

export const EndpointParametersEntity = pgTable('endpoint_parameters', {
  ...entityId,
  endpoint_id: varchar('endpoint_id', { length: 255 })
    .notNull()
    .references(() => EndpointsEntity.id, { onDelete: 'cascade' }),
  location: varchar('location', { length: 12 }).$type<ParameterLocation>().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  required: boolean('required').notNull().default(false),
  description: text('description'),
  schema_type: varchar('schema_type', { length: 32 }).$type<SchemaType>(),
  format: varchar('format', { length: 64 }),
  example: jsonb('example'),
  enum_values: jsonb('enum_values').$type<string[]>(),
  items: jsonb('items'),
  sort_order: integer('sort_order').notNull().default(0),
  ...baseEntity,
})

export type EndpointParameterRecord = InferSelectModel<typeof EndpointParametersEntity>
export type NewEndpointParameterRecord = InferInsertModel<typeof EndpointParametersEntity>
