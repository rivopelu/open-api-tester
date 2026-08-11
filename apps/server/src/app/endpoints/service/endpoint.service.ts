import { EndpointRepository } from '../repository/endpoint.repository'
import { BadRequestError, NotFoundError } from '../../../configs/exception'
import type { EndpointRecord } from '../entity/endpoint.entity'
import type { HttpMethod } from '@modern-api-studio/types'
import { ProjectService } from '../../projects/service/project.service'
import { EndpointFolderRepository } from '../../endpoint-folders/repository/endpoint-folder.repository'

export interface EndpointItem {
  id: string
  projectId: string
  folderId: string | null
  path: string
  method: string
  summary: string
  specData: Record<string, unknown>
  createdAt: string
  updatedAt: string | null
}

export interface SaveEndpointInput {
  projectId?: string
  folderId?: string | null
  path?: string
  method?: string
  summary?: string
  specData?: Record<string, unknown>
}

export class EndpointService {
  constructor(
    private repository: EndpointRepository = new EndpointRepository(),
    private projectService: ProjectService = new ProjectService(),
    private folderRepository: EndpointFolderRepository = new EndpointFolderRepository(),
  ) {}

  toItem(row: EndpointRecord): EndpointItem {
    return {
      id: row.id,
      projectId: row.project_id,
      folderId: row.folder_id,
      path: row.path,
      method: row.method,
      summary: row.summary,
      specData: (row.spec_data ?? {}) as Record<string, unknown>,
      createdAt: new Date(row.created_date).toISOString(),
      updatedAt: row.updated_date ? new Date(row.updated_date).toISOString() : null,
    }
  }

  async listByProject(projectId: string): Promise<EndpointItem[]> {
    const rows = await this.repository.findByProject(projectId)
    return rows.map((row) => this.toItem(row))
  }

  async get(id: string): Promise<EndpointItem> {
    const row = await this.repository.findById(id)
    if (!row) throw new NotFoundError('Endpoint not found')
    return this.toItem(row)
  }

  async create(input: SaveEndpointInput): Promise<EndpointItem> {
    if (!input.projectId) throw new NotFoundError('Project is required')
    // ensure project exists
    await this.projectService.get(input.projectId)
    await this.assertFolder(input.projectId, input.folderId ?? null)

    const row = await this.repository.insert({
      project_id: input.projectId,
      folder_id: input.folderId ?? null,
      path: input.path ?? '',
      method: (input.method as EndpointRecord['method']) ?? 'GET',
      summary: input.summary ?? '',
      spec_data: input.specData ?? {},
    })
    return this.toItem(row)
  }

  async update(id: string, input: SaveEndpointInput): Promise<EndpointItem> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new NotFoundError('Endpoint not found')
    if (input.folderId !== undefined) {
      await this.assertFolder(existing.project_id, input.folderId)
    }

    const patch: Partial<EndpointRecord> = {}
    if (input.path !== undefined) patch.path = input.path
    if (input.folderId !== undefined) patch.folder_id = input.folderId
    if (input.method !== undefined) patch.method = input.method as HttpMethod
    if (input.summary !== undefined) patch.summary = input.summary
    if (input.specData !== undefined) patch.spec_data = input.specData

    const row = await this.repository.update(id, patch)
    if (!row) throw new NotFoundError('Endpoint not found')
    return this.toItem(row)
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new NotFoundError('Endpoint not found')
    await this.repository.softDelete(id, deletedBy)
  }

  private async assertFolder(projectId: string, folderId: string | null): Promise<void> {
    if (!folderId) return
    const folder = await this.folderRepository.findById(folderId)
    if (!folder || folder.project_id !== projectId) {
      throw new BadRequestError('Folder does not belong to this project')
    }
  }
}