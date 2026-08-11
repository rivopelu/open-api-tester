import { jsonb, pgTable, text, varchar } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { OpenApiVersion } from '@modern-api-studio/types'
import { baseEntity, entityId } from '../../../lib/base.entity'

export const ProjectEntity = pgTable('projects', {
  ...entityId,
  name: text('name').notNull().default('Untitled Project'),
  description: text('description'),
  version: varchar('version', { length: 64 }).default('1.0.0'),
  openapi_version: varchar('openapi_version', { length: 16 })
    .$type<OpenApiVersion>()
    .default('openapi3'),
  global_security: jsonb('global_security').$type<string[]>().default([]),
  ...baseEntity,
})

export type Project = InferSelectModel<typeof ProjectEntity>
export type NewProject = InferInsertModel<typeof ProjectEntity>
