import { describe, expect, test, vi } from 'vitest'
import { EndpointService } from '../endpoint.service'
import type { EndpointRepository } from '../../repository/endpoint.repository'
import type { EndpointRecord } from '../../entity/endpoint.entity'
import type { ProjectService } from '../../../projects/service/project.service'
import type { EndpointFolderRepository } from '../../../endpoint-folders/repository/endpoint-folder.repository'

const row = {
  id: 'endpoint-1',
  project_id: 'project-1',
  folder_id: null,
  path: '/customers',
  method: 'GET',
  summary: 'List customers',
  sort_order: 0,
  spec_data: { tags: ['Customers'], responses: [] },
  active: true,
  created_date: 1000,
  created_by: null,
  updated_date: 2000,
  updated_by: null,
  deleted_date: null,
  deleted_by: null,
} satisfies EndpointRecord

const folder = {
  id: 'folder-1',
  project_id: row.project_id,
  parent_id: null,
  name: 'Customers',
  sort_order: 0,
  active: true,
  created_date: 1000,
  created_by: null,
  updated_date: null,
  updated_by: null,
  deleted_date: null,
  deleted_by: null,
}

function endpoint(
  id: string,
  folderId: string | null,
  sortOrder: number,
  projectId = row.project_id,
): EndpointRecord {
  return {
    ...row,
    id,
    project_id: projectId,
    folder_id: folderId,
    sort_order: sortOrder,
  }
}

function makeService(
  repository: Partial<EndpointRepository>,
  folderRepository: Partial<EndpointFolderRepository> = {},
): EndpointService {
  const projectService = { get: vi.fn(async () => ({ id: row.project_id })) }
  return new EndpointService(
    repository as EndpointRepository,
    projectService as unknown as ProjectService,
    folderRepository as EndpointFolderRepository,
  )
}

describe('EndpointService per-endpoint detail', () => {
  test('get returns full specData and sortOrder', async () => {
    const service = makeService({ findById: vi.fn(async () => row) })
    const result = await service.get(row.id)
    expect(result.specData).toEqual(row.spec_data)
    expect(result.sortOrder).toBe(row.sort_order)
  })

  test('listSummaryByProject excludes specData and includes sortOrder', async () => {
    const repository = { findByProject: vi.fn(async () => [row]) }
    const service = makeService(repository)
    const result = await service.listSummaryByProject(row.project_id)
    expect(result[0]).not.toHaveProperty('specData')
    expect(result[0]).toMatchObject({
      id: row.id,
      path: row.path,
      method: row.method,
      sortOrder: row.sort_order,
    })
  })
})

describe('EndpointService ordering', () => {
  test('create appends to the selected folder', async () => {
    const inserted = endpoint('endpoint-new', folder.id, 3)
    const repository = {
      nextSortOrder: vi.fn(async () => 3),
      insert: vi.fn(async () => inserted),
    }
    const service = makeService(repository, {
      findById: vi.fn(async () => folder),
    })

    const result = await service.create({
      projectId: row.project_id,
      folderId: folder.id,
      summary: 'Create customer',
    })

    expect(repository.nextSortOrder).toHaveBeenCalledWith(row.project_id, folder.id)
    expect(repository.insert).toHaveBeenCalledWith(expect.objectContaining({
      folder_id: folder.id,
      sort_order: 3,
    }))
    expect(result.sortOrder).toBe(3)
  })

  test('moving with the single-endpoint API appends to the destination', async () => {
    const existing = endpoint('endpoint-1', null, 0)
    const moved = endpoint('endpoint-1', folder.id, 2)
    const repository = {
      findById: vi.fn(async () => existing),
      nextSortOrder: vi.fn(async () => 2),
      update: vi.fn(async () => moved),
    }
    const service = makeService(repository, {
      findById: vi.fn(async () => folder),
    })

    await service.update(existing.id, { folderId: folder.id })

    expect(repository.nextSortOrder).toHaveBeenCalledWith(row.project_id, folder.id)
    expect(repository.update).toHaveBeenCalledWith(existing.id, {
      folder_id: folder.id,
      sort_order: 2,
    })
  })

  test('replaces a complete same-folder order', async () => {
    const endpoints = [
      endpoint('endpoint-1', null, 0),
      endpoint('endpoint-2', null, 1),
    ]
    const repository = {
      findByProject: vi.fn(async () => endpoints),
      replaceOrder: vi.fn(async () => undefined),
    }
    const service = makeService(repository)
    const groups = [{ folderId: null, endpointIds: ['endpoint-2', 'endpoint-1'] }]

    await service.replaceOrder(row.project_id, groups)

    expect(repository.replaceOrder).toHaveBeenCalledWith(row.project_id, groups)
  })

  test('replaces complete source and destination groups for a cross-folder move', async () => {
    const reordered = [
      endpoint('endpoint-2', null, 0),
      endpoint('endpoint-3', folder.id, 0),
      endpoint('endpoint-1', folder.id, 1),
    ]
    const repository = {
      findByProject: vi.fn()
        .mockResolvedValueOnce([
          endpoint('endpoint-1', null, 0),
          endpoint('endpoint-2', null, 1),
          endpoint('endpoint-3', folder.id, 0),
        ])
        .mockResolvedValueOnce(reordered),
      replaceOrder: vi.fn(async () => undefined),
    }
    const service = makeService(repository, {
      findById: vi.fn(async () => folder),
    })
    const groups = [
      { folderId: null, endpointIds: ['endpoint-2'] },
      { folderId: folder.id, endpointIds: ['endpoint-3', 'endpoint-1'] },
    ]

    const result = await service.replaceOrder(row.project_id, groups)

    expect(repository.replaceOrder).toHaveBeenCalledWith(row.project_id, groups)
    expect(result.map((item) => item.id)).toEqual(['endpoint-2', 'endpoint-3', 'endpoint-1'])
  })

  test.each([
    {
      name: 'duplicate scopes',
      groups: [
        { folderId: null, endpointIds: ['endpoint-1'] },
        { folderId: null, endpointIds: ['endpoint-2'] },
      ],
      message: 'Endpoint groups must be unique',
    },
    {
      name: 'duplicate endpoint IDs',
      groups: [
        { folderId: null, endpointIds: ['endpoint-1'] },
        { folderId: folder.id, endpointIds: ['endpoint-1'] },
      ],
      message: 'Endpoint IDs must be unique',
    },
  ])('rejects $name', async ({ groups, message }) => {
    const repository = { findByProject: vi.fn(async () => [row]) }
    const service = makeService(repository, {
      findById: vi.fn(async () => folder),
    })

    await expect(service.replaceOrder(row.project_id, groups)).rejects.toThrow(message)
  })

  test('rejects incomplete affected scopes', async () => {
    const repository = {
      findByProject: vi.fn(async () => [
        endpoint('endpoint-1', null, 0),
        endpoint('endpoint-2', null, 1),
      ]),
    }
    const service = makeService(repository)

    await expect(service.replaceOrder(row.project_id, [
      { folderId: null, endpointIds: ['endpoint-1'] },
    ])).rejects.toThrow('Endpoint groups must include every endpoint in the affected folders')
  })

  test('rejects an endpoint from another project', async () => {
    const repository = { findByProject: vi.fn(async () => [row]) }
    const service = makeService(repository)

    await expect(service.replaceOrder(row.project_id, [
      { folderId: null, endpointIds: ['endpoint-foreign'] },
    ])).rejects.toThrow('Endpoint does not belong to this project')
  })

  test('rejects a folder from another project', async () => {
    const repository = { findByProject: vi.fn(async () => [row]) }
    const service = makeService(repository, {
      findById: vi.fn(async () => ({ ...folder, project_id: 'project-2' })),
    })

    await expect(service.replaceOrder(row.project_id, [
      { folderId: folder.id, endpointIds: [] },
    ])).rejects.toThrow('Folder does not belong to this project')
  })
})
