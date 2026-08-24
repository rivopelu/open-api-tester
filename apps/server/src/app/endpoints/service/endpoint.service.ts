import { EndpointRepository } from '../repository/endpoint.repository'
import { BadRequestError, NotFoundError } from '../../../configs/exception'
import type { EndpointRecord } from '../entity/endpoint.entity'
import type { HttpMethod } from '@modern-api-studio/types'
import type { RequestBodyDefinition, ResponseDefinition } from '@modern-api-studio/types'
import { ProjectService } from '../../projects/service/project.service'
import { EndpointFolderRepository } from '../../endpoint-folders/repository/endpoint-folder.repository'

export interface EndpointItem {
  id: string
  projectId: string
  folderId: string | null
  path: string
  method: string
  summary: string
  sortOrder: number
  specData: Record<string, unknown>
  createdAt: string
  updatedAt: string | null
}

export type EndpointSummaryItem = Omit<EndpointItem, 'specData'>

export interface EndpointOrderGroup {
  folderId: string | null
  endpointIds: string[]
}

export interface SaveEndpointInput {
  projectId?: string
  folderId?: string | null
  path?: string
  method?: string
  summary?: string
  sortOrder?: number
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
      sortOrder: row.sort_order,
      specData: (row.spec_data ?? {}) as Record<string, unknown>,
      createdAt: new Date(row.created_date).toISOString(),
      updatedAt: row.updated_date ? new Date(row.updated_date).toISOString() : null,
    }
  }

  toSummaryItem(row: EndpointRecord): EndpointSummaryItem {
    const item = this.toItem(row)
    return {
      id: item.id,
      projectId: item.projectId,
      folderId: item.folderId,
      path: item.path,
      method: item.method,
      summary: item.summary,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }
  }

  async listSummaryByProject(projectId: string): Promise<EndpointSummaryItem[]> {
    const rows = await this.repository.findByProject(projectId)
    return rows.map((row) => this.toSummaryItem(row))
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

    const folderId = input.folderId ?? null
    const sortOrder = input.sortOrder
      ?? await this.repository.nextSortOrder(input.projectId, folderId)
    const row = await this.repository.insert({
      project_id: input.projectId,
      folder_id: folderId,
      path: input.path ?? '',
      method: (input.method as EndpointRecord['method']) ?? 'GET',
      summary: input.summary ?? '',
      sort_order: sortOrder,
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
    if (input.folderId !== undefined) {
      patch.folder_id = input.folderId
      if (input.folderId !== existing.folder_id && input.sortOrder === undefined) {
        patch.sort_order = await this.repository.nextSortOrder(existing.project_id, input.folderId)
      }
    }
    if (input.method !== undefined) patch.method = input.method as HttpMethod
    if (input.summary !== undefined) patch.summary = input.summary
    if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder
    if (input.specData !== undefined) patch.spec_data = input.specData

    const row = await this.repository.update(id, patch)
    if (!row) throw new NotFoundError('Endpoint not found')
    return this.toItem(row)
  }

  async replaceOrder(projectId: string, groups: EndpointOrderGroup[]): Promise<EndpointItem[]> {
    if (groups.length === 0) throw new BadRequestError('At least one endpoint group is required')

    const scopeKeys = new Set<string>()
    const endpointIds = new Set<string>()
    for (const group of groups) {
      const scopeKey = group.folderId === null ? 'root' : `folder:${group.folderId}`
      if (scopeKeys.has(scopeKey)) throw new BadRequestError('Endpoint groups must be unique')
      scopeKeys.add(scopeKey)
      await this.assertFolder(projectId, group.folderId)

      for (const endpointId of group.endpointIds) {
        if (endpointIds.has(endpointId)) throw new BadRequestError('Endpoint IDs must be unique')
        endpointIds.add(endpointId)
      }
    }

    const projectEndpoints = await this.repository.findByProject(projectId)
    const endpointById = new Map(projectEndpoints.map((endpoint) => [endpoint.id, endpoint]))
    for (const endpointId of Array.from(endpointIds)) {
      if (!endpointById.has(endpointId)) {
        throw new BadRequestError('Endpoint does not belong to this project')
      }
    }

    const affectedScopes = new Set(groups.map((group) => group.folderId))
    const currentAffectedIds = projectEndpoints
      .filter((endpoint) => affectedScopes.has(endpoint.folder_id))
      .map((endpoint) => endpoint.id)
    if (
      currentAffectedIds.length !== endpointIds.size
      || currentAffectedIds.some((endpointId) => !endpointIds.has(endpointId))
    ) {
      throw new BadRequestError('Endpoint groups must include every endpoint in the affected folders')
    }

    await this.repository.replaceOrder(projectId, groups)
    return this.listByProject(projectId)
  }

  async updateExamples(
    id: string,
    contract: { requestBody?: RequestBodyDefinition; responses: ResponseDefinition[] },
  ): Promise<EndpointItem> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new NotFoundError('Endpoint not found')

    const row = await this.repository.update(id, {
      spec_data: {
        ...((existing.spec_data ?? {}) as Record<string, unknown>),
        requestBody: contract.requestBody,
        responses: contract.responses,
      },
    })
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
