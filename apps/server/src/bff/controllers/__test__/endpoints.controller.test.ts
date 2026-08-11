import { describe, expect, test, vi } from 'vitest'
import { Hono } from 'hono'
import { SignJWT } from 'jose'
import { createEndpointsController } from '../endpoints.controller'
import { registerControllers } from '../../../lib/decorators'
import { errorHandler } from '../../../configs/error-handler'
import { authMiddleware } from '../../../middlewares/auth'
import { env } from '../../../configs/env'
import type { EndpointService } from '../../../app/endpoints/service/endpoint.service'

function fakeService(): EndpointService {
  return {
    replaceOrder: vi.fn(async () => []),
  } as unknown as EndpointService
}

async function makeToken(): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET)
  return new SignJWT({ sub: 'user-1', email: 'user@example.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(env.JWT_ISSUER)
    .setExpirationTime('1h')
    .sign(secret)
}

function buildApp(service: EndpointService = fakeService()) {
  const app = new Hono()
  app.onError(errorHandler)
  app.use('/api/*', authMiddleware())
  registerControllers(app, [createEndpointsController(service)], '/api')
  return app
}

describe('EndpointsController ordering', () => {
  test('PUT /api/projects/:projectId/endpoints/order forwards normalized groups', async () => {
    const service = fakeService()
    const app = buildApp(service)
    const token = await makeToken()
    const groups = [
      { folderId: null, endpointIds: ['endpoint-2'] },
      { folderId: 'folder-1', endpointIds: ['endpoint-1'] },
    ]

    const response = await app.request('/api/projects/project-1/endpoints/order', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ groups }),
    })

    expect(response.status).toBe(200)
    expect(service.replaceOrder).toHaveBeenCalledWith('project-1', groups)
  })

  test.each([
    { body: '{', name: 'invalid JSON' },
    { body: JSON.stringify({ groups: [] }), name: 'an empty group list' },
    {
      body: JSON.stringify({ groups: [{ folderId: 1, endpointIds: [] }] }),
      name: 'an invalid folder ID',
    },
    {
      body: JSON.stringify({ groups: [{ folderId: null, endpointIds: [1] }] }),
      name: 'an invalid endpoint ID',
    },
  ])('returns 400 for $name', async ({ body }) => {
    const service = fakeService()
    const app = buildApp(service)
    const token = await makeToken()

    const response = await app.request('/api/projects/project-1/endpoints/order', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
    })

    expect(response.status).toBe(400)
    expect(service.replaceOrder).not.toHaveBeenCalled()
  })
})
