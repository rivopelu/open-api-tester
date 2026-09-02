import { and, asc, eq, ilike, isNull, or, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { db as defaultDb } from '../../../configs/database.config'
import { EndpointsEntity, type EndpointRecord, type NewEndpointRecord } from '../entity/endpoint.entity'

export class EndpointRepository {
  constructor(private database: NodePgDatabase = defaultDb) {}

  async findAllActive(): Promise<EndpointRecord[]> {
    return this.database
      .select()
      .from(EndpointsEntity)
      .where(eq(EndpointsEntity.active, true))
      .orderBy(
        asc(EndpointsEntity.project_id),
        asc(EndpointsEntity.sort_order),
        asc(EndpointsEntity.created_date),
      )
  }

  async findByProject(projectId: string): Promise<EndpointRecord[]> {
    return this.database
      .select()
      .from(EndpointsEntity)
      .where(and(eq(EndpointsEntity.project_id, projectId), eq(EndpointsEntity.active, true)))
      .orderBy(
        asc(EndpointsEntity.sort_order),
        asc(EndpointsEntity.created_date),
        asc(EndpointsEntity.id),
      )
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
      .orderBy(
        asc(EndpointsEntity.sort_order),
        asc(EndpointsEntity.created_date),
        asc(EndpointsEntity.id),
      )
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

  async findByScope(projectId: string, folderId: string | null): Promise<EndpointRecord[]> {
    const folderCondition = folderId === null
      ? isNull(EndpointsEntity.folder_id)
      : eq(EndpointsEntity.folder_id, folderId)

    return this.database
      .select()
      .from(EndpointsEntity)
      .where(and(
        eq(EndpointsEntity.project_id, projectId),
        folderCondition,
        eq(EndpointsEntity.active, true),
      ))
      .orderBy(
        asc(EndpointsEntity.sort_order),
        asc(EndpointsEntity.created_date),
        asc(EndpointsEntity.id),
      )
  }

  async nextSortOrder(projectId: string, folderId: string | null): Promise<number> {
    const rows = await this.findByScope(projectId, folderId)
    return rows.reduce((maximum, row) => Math.max(maximum, row.sort_order), -1) + 1
  }

  async replaceOrder(
    projectId: string,
    groups: Array<{ folderId: string | null; endpointIds: string[] }>,
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      for (const group of groups) {
        for (let sortOrder = 0; sortOrder < group.endpointIds.length; sortOrder += 1) {
          const endpointId = group.endpointIds[sortOrder]
          await transaction
            .update(EndpointsEntity)
            .set({
              folder_id: group.folderId,
              sort_order: sortOrder,
              updated_date: Date.now(),
            })
            .where(and(
              eq(EndpointsEntity.id, endpointId),
              eq(EndpointsEntity.project_id, projectId),
              eq(EndpointsEntity.active, true),
            ))
        }
      }
    })
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
