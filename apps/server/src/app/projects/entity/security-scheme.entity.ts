import { jsonb, pgTable, text, varchar } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { SecuritySchemeType } from '@modern-api-studio/types'
import { baseEntity, entityId } from '../../../lib/base.entity'
import { ProjectEntity } from './project.entity'

export const SecuritySchemesEntity = pgTable('security_schemes', {
  ...entityId,
  project_id: varchar('project_id', { length: 255 })
    .notNull()
    .references(() => ProjectEntity.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 16 }).$type<SecuritySchemeType>().notNull().default('bearer'),
  description: text('description'),
  scheme: varchar('scheme', { length: 32 }),
  bearer_format: varchar('bearer_format', { length: 64 }),
  location: varchar('location', { length: 12 }).$type<'header' | 'query' | 'cookie'>(),
  key_name: varchar('key_name', { length: 255 }),
  flows: jsonb('flows'),
  ...baseEntity,
})

export type SecuritySchemeRecord = InferSelectModel<typeof SecuritySchemesEntity>
export type NewSecuritySchemeRecord = InferInsertModel<typeof SecuritySchemesEntity>
