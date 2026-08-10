import { pgTable, primaryKey, varchar } from 'drizzle-orm/pg-core'
import { EndpointsEntity } from './endpoint.entity'
import { TagEntity } from '../../projects/entity/tag.entity'

export const EndpointTagsEntity = pgTable(
  'endpoint_tags',
  {
    endpoint_id: varchar('endpoint_id', { length: 255 })
      .notNull()
      .references(() => EndpointsEntity.id, { onDelete: 'cascade' }),
    tag_id: varchar('tag_id', { length: 255 })
      .notNull()
      .references(() => TagEntity.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.endpoint_id, t.tag_id] })],
)
