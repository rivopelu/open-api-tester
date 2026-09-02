import { BadRequestError, NotFoundError } from '../../../configs/exception'
import type { EndpointFolderRecord } from '../entity/endpoint-folder.entity'
import { EndpointFolderRepository } from '../repository/endpoint-folder.repository'
import { ProjectService } from '../../projects/service/project.service'

export interface EndpointFolderItem {
  id: string
  projectId: string
  parentId: string | null
  name: string
  sortOrder: number
  createdAt: string
  updatedAt: string | null
}

export interface SaveEndpointFolderInput {
  projectId?: string
  parentId?: string | null
  name?: string
  sortOrder?: number
}

export class EndpointFolderService {
  constructor(
    private repository: EndpointFolderRepository = new EndpointFolderRepository(),
    private projectService: ProjectService = new ProjectService(),
  ) {}

  toItem(row: EndpointFolderRecord): EndpointFolderItem {
    return {
      id: row.id,
      projectId: row.project_id,
      parentId: row.parent_id,
      name: row.name,
      sortOrder: row.sort_order,
      createdAt: new Date(row.created_date).toISOString(),
      updatedAt: row.updated_date ? new Date(row.updated_date).toISOString() : null,
    }
  }

  async listByProject(projectId: string): Promise<EndpointFolderItem[]> {
    const rows = await this.repository.findByProject(projectId)
    return rows.map((row) => this.toItem(row))
  }

  async create(input: SaveEndpointFolderInput): Promise<EndpointFolderItem> {
    if (!input.projectId) throw new BadRequestError('Project is required')
    const name = input.name?.trim()
    if (!name) throw new BadRequestError('Folder name is required')
    await this.projectService.get(input.projectId)
    await this.assertParent(input.projectId, input.parentId ?? null)

    const row = await this.repository.insert({
      project_id: input.projectId,
      parent_id: input.parentId ?? null,
      name,
      sort_order: input.sortOrder ?? 0,
    })
    return this.toItem(row)
  }

  async update(id: string, input: SaveEndpointFolderInput): Promise<EndpointFolderItem> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new NotFoundError('Folder not found')

    if (input.parentId === id) throw new BadRequestError('Folder cannot be its own parent')
    if (input.parentId !== undefined) {
      await this.assertParent(existing.project_id, input.parentId)
      await this.assertNoCycle(id, input.parentId)
    }

    const patch: Partial<EndpointFolderRecord> = {}
    if (input.name !== undefined) {
      const name = input.name.trim()
      if (!name) throw new BadRequestError('Folder name is required')
      patch.name = name
    }
    if (input.parentId !== undefined) patch.parent_id = input.parentId
    if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder

    const row = await this.repository.update(id, patch)
    if (!row) throw new NotFoundError('Folder not found')
    return this.toItem(row)
  }

  async delete(id: string, deletedBy?: string): Promise<{ projectId: string }> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new NotFoundError('Folder not found')
    const folders = await this.repository.findByProject(existing.project_id)
    if (folders.some((folder) => folder.parent_id === id)) {
      throw new BadRequestError('Delete nested folders first')
    }
    await this.repository.softDelete(id, deletedBy)
    return { projectId: existing.project_id }
  }

  private async assertParent(projectId: string, parentId: string | null): Promise<void> {
    if (!parentId) return
    const parent = await this.repository.findById(parentId)
    if (!parent || parent.project_id !== projectId) {
      throw new BadRequestError('Parent folder does not belong to this project')
    }
  }

  private async assertNoCycle(id: string, parentId: string | null): Promise<void> {
    let cursor = parentId
    const visited = new Set<string>()
    while (cursor) {
      if (cursor === id) throw new BadRequestError('Folder nesting would create a cycle')
      if (visited.has(cursor)) throw new BadRequestError('Invalid folder hierarchy')
      visited.add(cursor)
      const parent = await this.repository.findById(cursor)
      cursor = parent?.parent_id ?? null
    }
  }
}
