import { ProjectRepository } from '../repository/project.repository'
import { NotFoundError, BadRequestError } from '../../../configs/exception'
import type { CreateProjectInput, UpdateProjectInput, ProjectItem } from '../types/project.types'
import type { Project } from '../entity/project.entity'

export class ProjectService {
  constructor(private repository: ProjectRepository = new ProjectRepository()) {}

  toItem(row: Project): ProjectItem {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      version: row.version,
      createdAt: new Date(row.created_date).toISOString(),
      updatedAt: row.updated_date ? new Date(row.updated_date).toISOString() : null,
      createdById: row.created_by,
    }
  }

  async list(): Promise<ProjectItem[]> {
    const rows = await this.repository.findActive()
    return rows.map((row) => this.toItem(row))
  }

  async get(id: string): Promise<ProjectItem> {
    const row = await this.repository.findActiveById(id)
    if (!row) throw new NotFoundError('Project not found')
    return this.toItem(row)
  }

  async create(input: CreateProjectInput): Promise<ProjectItem> {
    const name = input.name.trim()
    if (!name) throw new BadRequestError('Project name is required')
    const row = await this.repository.insert({
      name,
      created_by: input.created_by,
    })
    return this.toItem(row)
  }

  async update(id: string, input: UpdateProjectInput): Promise<ProjectItem> {
    const existing = await this.repository.findActiveById(id)
    if (!existing) throw new NotFoundError('Project not found')

    const patch: UpdateProjectInput = {}
    if (input.name !== undefined) {
      const name = input.name.trim()
      if (!name) throw new BadRequestError('Project name is required')
      patch.name = name
    }

    const row = await this.repository.update(id, patch)
    return this.toItem(row)
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    const existing = await this.repository.findActiveById(id)
    if (!existing) throw new NotFoundError('Project not found')
    await this.repository.softDelete(id, deletedBy)
  }
}
