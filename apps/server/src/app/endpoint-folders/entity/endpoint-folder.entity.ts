import { integer, pgTable, text, varchar, type AnyPgColumn } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { baseEntity, entityId } from '../../../lib/base.entity'
import { ProjectEntity } from '../../projects/entity/project.entity'

export const EndpointFoldersEntity = pgTable('endpoint_folders', {
  ...entityId,
  project_id: varchar('project_id', { length: 255 })
    .notNull()
    .references(() => ProjectEntity.id, { onDelete: 'cascade' }),
  parent_id: varchar('parent_id', { length: 255 }).references(
    (): AnyPgColumn => EndpointFoldersEntity.id,
    { onDelete: 'restrict' },
  ),
  name: text('name').notNull(),
  sort_order: integer('sort_order').notNull().default(0),
  ...baseEntity,
})

export type EndpointFolderRecord = InferSelectModel<typeof EndpointFoldersEntity>
export type NewEndpointFolderRecord = InferInsertModel<typeof EndpointFoldersEntity>
