import { describe, expect, test, vi } from 'vitest'
import { EndpointService } from '../endpoint.service'
import type { EndpointRepository } from '../../repository/endpoint.repository'
import type { EndpointRecord } from '../../entity/endpoint.entity'

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

function makeService(repository: Partial<EndpointRepository>): EndpointService {
  return new EndpointService(repository as EndpointRepository)
}

describe('EndpointService per-endpoint detail', () => {
  test('get returns full specData', async () => {
    const service = makeService({ findById: vi.fn(async () => row) })
    const result = await service.get(row.id)
    expect(result.specData).toEqual(row.spec_data)
  })

  test('listSummaryByProject excludes specData', async () => {
    const repository = { findByProject: vi.fn(async () => [row]) }
    const service = makeService(repository)
    const result = await service.listSummaryByProject(row.project_id)
    expect(result[0]).not.toHaveProperty('specData')
    expect(result[0]).toMatchObject({ id: row.id, path: row.path, method: row.method })
  })
})