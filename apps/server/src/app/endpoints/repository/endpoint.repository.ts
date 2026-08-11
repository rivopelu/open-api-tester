import { and, eq, ilike, or, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { db as defaultDb } from '../../../configs/database.config'
import { EndpointsEntity, type EndpointRecord, type NewEndpointRecord } from '../entity/endpoint.entity'

export class EndpointRepository {
  constructor(private database: NodePgDatabase = defaultDb) {}

  async findByProject(projectId: string): Promise<EndpointRecord[]> {
    return this.database
      .select()
      .from(EndpointsEntity)
      .where(and(eq(EndpointsEntity.project_id, projectId), eq(EndpointsEntity.active, true)))
      .orderBy(EndpointsEntity.sort_order)
  }

  async findByProjectFiltered(input: {
    projectId: string
    method?: string
    folderId?: string
    query?: string
    limit?: number
  }): Promise<EndpointRecord[]> {
    const conditions = [eq(EndpointsEntity.project_id, input.projectId), eq(EndpointsEntity.active, true)]
    if (input.method) conditions.push(sql`upper(${EndpointsEntity.method}) = ${input.method.toUpperCase()}`)
    if (input.folderId) conditions.push(eq(EndpointsEntity.folder_id, input.folderId))
    if (input.query) {
      const pattern = `%${input.query.trim()}%`
      conditions.push(or(ilike(EndpointsEntity.path, pattern), ilike(EndpointsEntity.summary, pattern))!)
    }
    return this.database
      .select()
      .from(EndpointsEntity)
      .where(and(...conditions))
      .orderBy(EndpointsEntity.sort_order)
      .limit(Math.min(200, Math.max(1, input.limit ?? 50)))
  }

  async findById(id: string): Promise<EndpointRecord | null> {
    const result = await this.database
      .select()
      .from(EndpointsEntity)
      .where(and(eq(EndpointsEntity.id, id), eq(EndpointsEntity.active, true)))
      .limit(1)
    return result[0] ?? null
  }

  async insert(input: NewEndpointRecord): Promise<EndpointRecord> {
    const result = await this.database.insert(EndpointsEntity).values(input).returning()
    return result[0]
  }

  async update(id: string, input: Partial<NewEndpointRecord>): Promise<EndpointRecord | null> {
    const result = await this.database
      .update(EndpointsEntity)
      .set({ ...input, updated_date: Date.now() })
      .where(eq(EndpointsEntity.id, id))
      .returning()
    return result[0] ?? null
  }

  async softDelete(id: string, deletedBy?: string): Promise<EndpointRecord | null> {
    const result = await this.database
      .update(EndpointsEntity)
      .set({
        active: false,
        deleted_date: Date.now(),
        ...(deletedBy ? { deleted_by: deletedBy } : {}),
      })
      .where(eq(EndpointsEntity.id, id))
      .returning()
    return result[0] ?? null
  }
}
