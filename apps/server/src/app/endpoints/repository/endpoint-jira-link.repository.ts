import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { db as defaultDb } from '../../../configs/database.config'
import {
  EndpointJiraLinksEntity,
  type EndpointJiraLinkRecord,
  type NewEndpointJiraLinkRecord,
} from '../entity/endpoint-jira-link.entity'

export class EndpointJiraLinkRepository {
  constructor(private database: NodePgDatabase = defaultDb) {}

  async findByEndpoint(endpointId: string): Promise<EndpointJiraLinkRecord[]> {
    return this.database
      .select()
      .from(EndpointJiraLinksEntity)
      .where(
        and(
          eq(EndpointJiraLinksEntity.endpoint_id, endpointId),
          eq(EndpointJiraLinksEntity.active, true),
        ),
      )
      .orderBy(EndpointJiraLinksEntity.created_date)
  }

  async findById(id: string): Promise<EndpointJiraLinkRecord | null> {
    const result = await this.database
      .select()
      .from(EndpointJiraLinksEntity)
      .where(and(eq(EndpointJiraLinksEntity.id, id), eq(EndpointJiraLinksEntity.active, true)))
      .limit(1)
    return result[0] ?? null
  }

  async insert(input: NewEndpointJiraLinkRecord): Promise<EndpointJiraLinkRecord> {
    const result = await this.database.insert(EndpointJiraLinksEntity).values(input).returning()
    return result[0]
  }

  async softDelete(id: string, deletedBy?: string): Promise<EndpointJiraLinkRecord | null> {
    const result = await this.database
      .update(EndpointJiraLinksEntity)
      .set({
        active: false,
        deleted_date: Date.now(),
        ...(deletedBy ? { deleted_by: deletedBy } : {}),
      })
      .where(eq(EndpointJiraLinksEntity.id, id))
      .returning()
    return result[0] ?? null
  }
}
