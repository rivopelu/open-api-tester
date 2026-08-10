import { desc, eq, and } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { db as defaultDb } from '../../../configs/database.config'
import { ProjectEntity, type Project, type NewProject } from '../entity/project.entity'

export class ProjectRepository {
  constructor(private database: NodePgDatabase = defaultDb) {}

  async findActive(): Promise<Project[]> {
    return this.database
      .select()
      .from(ProjectEntity)
      .where(eq(ProjectEntity.active, true))
      .orderBy(desc(ProjectEntity.updated_date))
  }

  async findActiveById(id: string): Promise<Project | null> {
    const result = await this.database
      .select()
      .from(ProjectEntity)
      .where(and(eq(ProjectEntity.id, id), eq(ProjectEntity.active, true)))
      .limit(1)
    return result[0] ?? null
  }

  async insert(input: NewProject): Promise<Project> {
    const result = await this.database.insert(ProjectEntity).values(input).returning()
    return result[0]
  }

  async update(id: string, input: Partial<NewProject>): Promise<Project> {
    const result = await this.database
      .update(ProjectEntity)
      .set({ ...input, updated_date: Date.now() })
      .where(eq(ProjectEntity.id, id))
      .returning()
    return result[0]
  }

  async softDelete(id: string, deletedBy?: string): Promise<Project> {
    const result = await this.database
      .update(ProjectEntity)
      .set({
        active: false,
        deleted_date: Date.now(),
        ...(deletedBy ? { deleted_by: deletedBy } : {}),
      })
      .where(eq(ProjectEntity.id, id))
      .returning()
    return result[0]
  }
}