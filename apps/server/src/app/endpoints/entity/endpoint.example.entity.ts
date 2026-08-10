import { integer, pgTable, text, varchar } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { baseEntity, entityId } from '../../../lib/base.entity'
import { EndpointRequestBodiesEntity } from './endpoint.request-body.entity'
import { EndpointResponsesEntity } from './endpoint.response.entity'

export const EndpointResponseExamplesEntity = pgTable('endpoint_response_examples', {
  ...entityId,
  response_id: varchar('response_id', { length: 255 })
    .notNull()
    .references(() => EndpointResponsesEntity.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  summary: text('summary'),
  value: text('value').notNull(),
  sort_order: integer('sort_order').notNull().default(0),
  ...baseEntity,
})

export const EndpointRequestExamplesEntity = pgTable('endpoint_request_examples', {
  ...entityId,
  request_body_id: varchar('request_body_id', { length: 255 })
    .notNull()
    .references(() => EndpointRequestBodiesEntity.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  summary: text('summary'),
  value: text('value').notNull(),
  sort_order: integer('sort_order').notNull().default(0),
  ...baseEntity,
})

export type EndpointResponseExampleRecord = InferSelectModel<typeof EndpointResponseExamplesEntity>
export type NewEndpointResponseExampleRecord = InferInsertModel<
  typeof EndpointResponseExamplesEntity
>
export type EndpointRequestExampleRecord = InferSelectModel<typeof EndpointRequestExamplesEntity>
export type NewEndpointRequestExampleRecord = InferInsertModel<typeof EndpointRequestExamplesEntity>
