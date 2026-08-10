import { boolean, integer, jsonb, pgTable, text, varchar } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { SchemaType } from '@modern-api-studio/types'
import { baseEntity, entityId } from '../../../lib/base.entity'
import { ProjectEntity } from './project.entity'

export const ComponentSchemasEntity = pgTable('component_schemas', {
  ...entityId,
  project_id: varchar('project_id', { length: 255 })
    .notNull()
    .references(() => ProjectEntity.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  ...baseEntity,
})

export const SchemaPropertiesEntity = pgTable('schema_properties', {
  ...entityId,
  schema_id: varchar('schema_id', { length: 255 }).references(() => ComponentSchemasEntity.id, {
    onDelete: 'cascade',
  }),
  parent_id: varchar('parent_id', { length: 255 }).references(
    (): any => SchemaPropertiesEntity.id,
    {
      onDelete: 'cascade',
    },
  ),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 32 }).$type<SchemaType>().notNull(),
  format: varchar('format', { length: 64 }),
  required: boolean('required').notNull().default(false),
  nullable: boolean('nullable').notNull().default(false),
  description: text('description'),
  example: jsonb('example'),
  default_value: jsonb('default_value'),
  enum_values: jsonb('enum_values').$type<string[]>(),
  items: jsonb('items'),
  ref: varchar('ref', { length: 255 }),
  sort_order: integer('sort_order').notNull().default(0),
  ...baseEntity,
})

export type ComponentSchemaRecord = InferSelectModel<typeof ComponentSchemasEntity>
export type NewComponentSchemaRecord = InferInsertModel<typeof ComponentSchemasEntity>
export type SchemaPropertyRecord = InferSelectModel<typeof SchemaPropertiesEntity>
export type NewSchemaPropertyRecord = InferInsertModel<typeof SchemaPropertiesEntity>
