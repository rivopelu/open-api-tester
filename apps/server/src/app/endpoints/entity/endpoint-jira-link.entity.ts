import { pgTable, uniqueIndex, varchar } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { baseEntity, entityId } from '../../../lib/base.entity'
import { EndpointsEntity } from './endpoint.entity'

export const EndpointJiraLinksEntity = pgTable(
  'endpoint_jira_links',
  {
    ...entityId,
    endpoint_id: varchar('endpoint_id', { length: 255 })
      .notNull()
      .references(() => EndpointsEntity.id, { onDelete: 'cascade' }),
    issue_key: varchar('issue_key', { length: 64 }).notNull(),
    category: varchar('category', { length: 64 }).notNull().default(''),
    ...baseEntity,
  },
  (table) => ({
    uniqueLink: uniqueIndex('endpoint_jira_links_endpoint_issue_idx').on(
      table.endpoint_id,
      table.issue_key,
    ),
  }),
)

export type EndpointJiraLinkRecord = InferSelectModel<typeof EndpointJiraLinksEntity>
export type NewEndpointJiraLinkRecord = InferInsertModel<typeof EndpointJiraLinksEntity>
