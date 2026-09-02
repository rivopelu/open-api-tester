import { describe, expect, test, vi } from 'vitest'
import { createMockApp } from '../mock.controller'
import type { EndpointRecord } from '../../../app/endpoints/entity/endpoint.entity'
import type { EndpointRepository } from '../../../app/endpoints/repository/endpoint.repository'

function repoWith(endpoints: EndpointRecord[]): EndpointRepository {
  return {
    findById: vi.fn(async (id: string) => endpoints.find((endpoint) => endpoint.id === id) ?? null),
    findAllActive: vi.fn(async () => endpoints),
  } as unknown as EndpointRepository
}

function record(id: string, specData: Record<string, unknown>): EndpointRecord {
  return {
    id,
    project_id: 'p1',
    folder_id: null,
    path: '/users/{id}',
    method: 'GET',
    summary: 'Get user',
    sort_order: 0,
    spec_data: specData,
    created_date: 0,
    updated_date: null,
    active: true,
    deleted_by: null,
    deleted_date: null,
  } as unknown as EndpointRecord
}

const spec = {
  responses: [
    {
      id: 'r1',
      statusCode: '200',
      description: 'OK',
      contentType: 'application/json',
      examples: [{ id: 'a', name: 'full', value: '{"id":42}' }],
    },
    {
      id: 'r2',
      statusCode: '404',
      description: 'Missing',
      contentType: 'application/json',
      examples: [{ id: 'b', name: 'err', value: '{"error":"not found"}' }],
    },
  ],
}

describe('mock server routes', () => {
  test('GET / serves the directory of every servable example', async () => {
    const app = createMockApp(repoWith([record('ep-1', spec)]))
    const response = await app.request('/')
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      response_data: Array<{ url: string; exampleId: string | null }>
    }
    expect(body.response_data).toHaveLength(2)
    expect(body.response_data[0].url).toBe('/api/mock/ep-1/ex/a')
    expect(body.response_data[1].url).toBe('/api/mock/ep-1/ex/b')
  })

  test('GET /:id returns the default example with its status and content type', async () => {
    const app = createMockApp(repoWith([record('ep-1', spec)]))
    const response = await app.request('/ep-1')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.text()).toBe('{"id":42}')
  })

  test('GET /:id/:status returns that status example and exact stored body', async () => {
    const app = createMockApp(repoWith([record('ep-1', spec)]))
    const response = await app.request('/ep-1/404')
    expect(response.status).toBe(404)
    expect(await response.text()).toBe('{"error":"not found"}')
  })

  test('GET /:id/ex/:exampleId returns the exact example payload', async () => {
    const app = createMockApp(repoWith([record('ep-1', spec)]))
    const response = await app.request('/ep-1/ex/b')
    expect(response.status).toBe(404)
    expect(await response.text()).toBe('{"error":"not found"}')
  })

  test('?example= query selects a specific example too', async () => {
    const app = createMockApp(repoWith([record('ep-1', spec)]))
    const response = await app.request('/ep-1?example=b')
    expect(response.status).toBe(404)
    expect(await response.text()).toBe('{"error":"not found"}')
  })

  test('returns 404 for an unknown endpoint id', async () => {
    const app = createMockApp(repoWith([]))
    const response = await app.request('/nope')
    expect(response.status).toBe(404)
  })

  test('returns 404 when the endpoint has no mockable responses', async () => {
    const app = createMockApp(repoWith([record('ep-empty', {})]))
    const response = await app.request('/ep-empty')
    expect(response.status).toBe(404)
  })

  test('serves non-JSON content types verbatim', async () => {
    const app = createMockApp(
      repoWith([
        record('ep-xml', {
          responses: [
            {
              id: 'r1',
              statusCode: '200',
              description: '',
              contentType: 'application/xml',
              examples: [{ id: 'a', name: 'x', value: '<root/>' }],
            },
          ],
        }),
      ]),
    )
    const response = await app.request('/ep-xml')
    expect(response.headers.get('content-type')).toContain('application/xml')
    expect(await response.text()).toBe('<root/>')
  })
})
