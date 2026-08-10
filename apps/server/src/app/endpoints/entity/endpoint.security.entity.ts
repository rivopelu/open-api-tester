import { pgTable, primaryKey, varchar } from 'drizzle-orm/pg-core'
import { EndpointsEntity } from './endpoint.entity'
import { SecuritySchemesEntity } from '../../projects/entity/security-scheme.entity'

export const EndpointSecuritySchemesEntity = pgTable(
  'endpoint_security_schemes',
  {
    endpoint_id: varchar('endpoint_id', { length: 255 })
      .notNull()
      .references(() => EndpointsEntity.id, { onDelete: 'cascade' }),
    security_scheme_id: varchar('security_scheme_id', { length: 255 })
      .notNull()
      .references(() => SecuritySchemesEntity.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.endpoint_id, t.security_scheme_id] })],
)
