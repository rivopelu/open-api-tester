import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { db as defaultDb } from '../../../configs/database.config'
import {
  EndpointFoldersEntity,
  type EndpointFolderRecord,
  type NewEndpointFolderRecord,
} from '../entity/endpoint-folder.entity'
import { EndpointsEntity } from '../../endpoints/entity/endpoint.entity'

export class EndpointFolderRepository {
  constructor(private database: NodePgDatabase = defaultDb) {}

  async findByProject(projectId: string): Promise<EndpointFolderRecord[]> {
    return this.database
      .select()
      .from(EndpointFoldersEntity)
      .where(and(
        eq(EndpointFoldersEntity.project_id, projectId),
        eq(EndpointFoldersEntity.active, true),
      ))
      .orderBy(EndpointFoldersEntity.sort_order)
  }

  async findById(id: string): Promise<EndpointFolderRecord | null> {
    const result = await this.database
      .select()
      .from(EndpointFoldersEntity)
      .where(and(eq(EndpointFoldersEntity.id, id), eq(EndpointFoldersEntity.active, true)))
      .limit(1)
    return result[0] ?? null
  }

  async insert(input: NewEndpointFolderRecord): Promise<EndpointFolderRecord> {
    const result = await this.database.insert(EndpointFoldersEntity).values(input).returning()
    return result[0]
  }

  async update(
    id: string,
    input: Partial<NewEndpointFolderRecord>,
  ): Promise<EndpointFolderRecord | null> {
    const result = await this.database
      .update(EndpointFoldersEntity)
      .set({ ...input, updated_date: Date.now() })
      .where(eq(EndpointFoldersEntity.id, id))
      .returning()
    return result[0] ?? null
  }

  async softDelete(id: string, deletedBy?: string): Promise<EndpointFolderRecord | null> {
    await this.database
      .update(EndpointsEntity)
      .set({ folder_id: null, updated_date: Date.now() })
      .where(eq(EndpointsEntity.folder_id, id))
    const result = await this.database
      .update(EndpointFoldersEntity)
      .set({
        active: false,
        deleted_date: Date.now(),
        ...(deletedBy ? { deleted_by: deletedBy } : {}),
      })
      .where(eq(EndpointFoldersEntity.id, id))
      .returning()
    return result[0] ?? null
  }
}
