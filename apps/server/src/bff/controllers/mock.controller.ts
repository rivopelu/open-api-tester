import { Hono } from 'hono'
import type { Context } from 'hono'
import { NotFoundError } from '../../configs/exception'
import { EndpointRepository } from '../../app/endpoints/repository/endpoint.repository'
import { collectMockExamples, resolveMock } from '../../app/mock/service/mock.service'

export interface MockDirectoryEntry {
  endpointId: string
  endpointMethod: string
  endpointPath: string
  endpointSummary: string
  responseStatus: string
  exampleId: string | null
  exampleName: string | null
  exampleSummary: string | null
  url: string
}

/**
 * Public mock server mounted under `${API_PREFIX}/mock`. Serves stored
 * response examples over plain GET (no auth):
 *   /api/mock                        → directory of every servable example
 *   /api/mock/:endpointId            → default (first) response example
 *   /api/mock/:endpointId/:status    → first example for a status code
 *   /api/mock/:endpointId/ex/:exampleId (or ?example=) → a specific example
 */
export function createMockApp(endpointRepository: EndpointRepository = new EndpointRepository()) {
  const mockApp = new Hono()

  mockApp.get('/', async (c) => {
    const endpoints = await endpointRepository.findAllActive()
    return c.json({
      success: true,
      message: 'success',
      response_data: collectMockDirectory(endpoints),
    })
  })

  const send = async (c: Context) => {
    const endpoint = await endpointRepository.findById(c.req.param('endpointId')!)
    if (!endpoint) return c.json({ success: false, message: 'Endpoint not found' }, 404)
    try {
      const payload = resolveMock((endpoint.spec_data ?? {}) as Record<string, unknown>, {
        exampleId: c.req.param('exampleId') ?? c.req.query('example'),
        status: c.req.param('statusSegment'),
      })
      const headers: Record<string, string> = {}
      for (const [name, parameter] of Object.entries(payload.headers ?? {})) {
        if (
          name &&
          name.toLowerCase() !== 'content-type' &&
          typeof parameter?.schema?.example === 'string'
        ) {
          headers[name] = parameter.schema.example
        }
      }
      return c.body(payload.body, payload.statusCode as 200, {
        'Content-Type': payload.contentType,
        ...headers,
      })
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ success: false, message: error.message }, 404)
      }
      throw error
    }
  }

  mockApp.get('/:endpointId', send)
  mockApp.get('/:endpointId/:statusSegment{[0-9]{3}}', send)
  mockApp.get('/:endpointId/ex/:exampleId', send)

  return mockApp
}

export function collectMockDirectory(
  endpoints: Array<{
    id: string
    method: string
    path: string
    summary: string
    specData?: Record<string, unknown>
    spec_data?: Record<string, unknown>
  }>,
): MockDirectoryEntry[] {
  return endpoints.flatMap((endpoint) =>
    collectMockExamples([
      {
        id: endpoint.id,
        method: endpoint.method,
        path: endpoint.path,
        summary: endpoint.summary,
        specData: endpoint.specData ?? endpoint.spec_data ?? {},
      },
    ]).map((entry) => ({
      endpointId: entry.endpointId,
      endpointMethod: entry.endpointMethod,
      endpointPath: entry.endpointPath,
      endpointSummary: entry.endpointSummary,
      responseStatus: entry.responseStatus,
      exampleId: entry.exampleId,
      exampleName: entry.exampleName,
      exampleSummary: entry.exampleSummary,
      url: entry.exampleId
        ? `/api/mock/${entry.endpointId}/ex/${entry.exampleId}`
        : `/api/mock/${entry.endpointId}/${entry.responseStatus}`,
    })),
  )
}
