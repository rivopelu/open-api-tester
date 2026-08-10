import { describe, expect, test, vi } from 'vitest'
import { ProjectService } from '../project.service'
import { NotFoundError, BadRequestError } from '../../../../configs/exception'
import type { Project } from '../../entity/project.entity'

const mockRow: Project = {
  id: 'proj-1',
  name: 'My API',
  description: null,
  version: '1.0.0',
  openapi_version: 'openapi3',
  global_security: [],
  spec_data: { id: 'spec-1' },
  active: true,
  created_date: 1000,
  created_by: 'user-1',
  updated_date: 2000,
  updated_by: null,
  deleted_date: null,
  deleted_by: null,
}

function createService(
  stubs: Partial<{
    findActive: () => Promise<Project[]>
    findActiveById: (id: string) => Promise<Project | null>
    insert: (input: any) => Promise<Project>
    update: (id: string, input: any) => Promise<Project>
    softDelete: (id: string, deletedBy?: string) => Promise<Project>
  }>,
) {
  const mockRepo = {
    findActive: stubs.findActive ?? (async () => []),
    findActiveById: stubs.findActiveById ?? (async () => null),
    insert: stubs.insert ?? (async (input) => ({ ...mockRow, ...input })),
    update: stubs.update ?? (async (id, input) => ({ ...mockRow, ...input })),
    softDelete: stubs.softDelete ?? (async () => mockRow),
  } as any
  return new ProjectService(mockRepo)
}

describe('ProjectService', () => {
  test('list maps rows to items ordered by repo output', async () => {
    const service = createService({ findActive: async () => [mockRow] })
    const items = await service.list()
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('proj-1')
    expect(items[0].specData).toEqual({ id: 'spec-1' })
    expect(items[0].updatedAt).toBe(new Date(2000).toISOString())
  })

  test('list returns empty when no rows', async () => {
    const service = createService({ findActive: async () => [] })
    expect(await service.list()).toEqual([])
  })

  test('get returns item when found', async () => {
    const service = createService({ findActiveById: async () => mockRow })
    const item = await service.get('proj-1')
    expect(item.name).toBe('My API')
    expect(item.createdAt).toBe(new Date(1000).toISOString())
  })

  test('get throws NotFoundError when missing', async () => {
    const service = createService({ findActiveById: async () => null })
    expect(service.get('missing')).rejects.toThrow(NotFoundError)
  })

  test('create inserts trimmed name and default spec data', async () => {
    const insert = vi.fn(async (input: any) => ({ ...mockRow, ...input }))
    const service = createService({ insert })
    const item = await service.create({ name: '  New API  ', created_by: 'user-1' })
    expect(item.name).toBe('New API')
    expect(insert).toHaveBeenCalledTimes(1)
  })

  test('create throws BadRequestError for blank name', async () => {
    const service = createService({})
    expect(service.create({ name: '   ', created_by: 'user-1' })).rejects.toThrow(BadRequestError)
  })

  test('update trims name and passes patch', async () => {
    const update = vi.fn(async (id: string, input: any) => ({ ...mockRow, ...input }))
    const service = createService({ findActiveById: async () => mockRow, update })
    const item = await service.update('proj-1', { name: '  Renamed  ' })
    expect(item.name).toBe('Renamed')
    expect(item.specData).toEqual({ id: 'spec-1' })
    expect(update).toHaveBeenCalledTimes(1)
  })

  test('update passes spec_data patch', async () => {
    const update = vi.fn(async (id: string, input: any) => ({ ...mockRow, ...input }))
    const service = createService({ findActiveById: async () => mockRow, update })
    const item = await service.update('proj-1', { spec_data: { id: 'new-spec' } })
    expect(item.specData).toEqual({ id: 'new-spec' })
  })

  test('update throws NotFoundError when project missing', async () => {
    const service = createService({ findActiveById: async () => null })
    expect(service.update('missing', { name: 'X' })).rejects.toThrow(NotFoundError)
  })

  test('update throws BadRequestError for blank name', async () => {
    const service = createService({ findActiveById: async () => mockRow })
    expect(service.update('proj-1', { name: ' ' })).rejects.toThrow(BadRequestError)
  })

  test('delete soft deletes existing project', async () => {
    const softDelete = vi.fn(async (id: string, deletedBy?: string) => mockRow)
    const service = createService({ findActiveById: async () => mockRow, softDelete })
    await service.delete('proj-1', 'user-1')
    expect(softDelete).toHaveBeenCalledWith('proj-1', 'user-1')
  })

  test('delete throws NotFoundError when project missing', async () => {
    const service = createService({ findActiveById: async () => null })
    expect(service.delete('missing')).rejects.toThrow(NotFoundError)
  })

  test('toItem normalizes null updated_date to null updatedAt', () => {
    const service = createService({})
    const item = service.toItem({ ...mockRow, updated_date: null })
    expect(item.updatedAt).toBeNull()
  })

  test('toItem falls back to empty object when spec_data is null', () => {
    const service = createService({})
    const item = service.toItem({
      ...mockRow,
      spec_data: null as unknown as Record<string, unknown>,
    })
    expect(item.specData).toEqual({})
  })
})
