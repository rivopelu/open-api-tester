import { describe, expect, test, vi } from 'vitest'
import { Hono } from 'hono'
import { SignJWT } from 'jose'
import { createProjectsController } from '../projects.controller'
import { registerControllers } from '../../../lib/decorators'
import { errorHandler } from '../../../configs/error-handler'
import { authMiddleware } from '../../../middlewares/auth'
import { env } from '../../../configs/env'
import type { ProjectService } from '../../../app/projects/service/project.service'
import type { ProjectItem } from '../../../app/projects/types/project.types'

const item: ProjectItem = {
  id: 'proj-1',
  name: 'My API',
  specData: { id: 'spec-1' },
  createdAt: new Date(1000).toISOString(),
  updatedAt: new Date(2000).toISOString(),
}

function fakeService(): ProjectService {
  return {
    list: vi.fn(async () => [item]),
    get: vi.fn(async () => item),
    create: vi.fn(async () => item),
    update: vi.fn(async () => item),
    delete: vi.fn(async () => undefined),
    toItem: vi.fn(async () => item),
  } as unknown as ProjectService
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

function buildApp(service?: ProjectService) {
  const app = new Hono()
  app.onError(errorHandler)
  app.use('/api/*', authMiddleware())
  registerControllers(app, [createProjectsController(service ?? fakeService())], '/api')
  return app
}

describe('ProjectsController', () => {
  test('POST /api/projects returns 401 without token', async () => {
    const app = buildApp()
    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X' }),
    })
    expect(res.status).toBe(401)
  })

  test('POST /api/projects returns 400 for invalid JSON', async () => {
    const app = buildApp()
    const token = await makeToken()
    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: '{',
    })
    expect(res.status).toBe(400)
  })

  test('POST /api/projects returns 422 for invalid body', async () => {
    const app = buildApp()
    const token = await makeToken()
    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: '' }),
    })
    expect(res.status).toBe(422)
  })

  test('POST /api/projects creates project', async () => {
    const service = fakeService()
    const app = buildApp(service)
    const token = await makeToken()
    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'New API' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.response_data.id).toBe('proj-1')
    expect(service.create).toHaveBeenCalledWith({ name: 'New API', created_by: 'user-1' })
  })

  test('GET /api/projects lists projects', async () => {
    const app = buildApp()
    const token = await makeToken()
    const res = await app.request('/api/projects', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.response_data).toHaveLength(1)
    expect(body.response_data[0].name).toBe('My API')
  })

  test('GET /api/projects/:id returns project', async () => {
    const app = buildApp()
    const token = await makeToken()
    const res = await app.request('/api/projects/proj-1', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.response_data.id).toBe('proj-1')
  })

  test('PUT /api/projects/:id updates project', async () => {
    const service = fakeService()
    const app = buildApp(service)
    const token = await makeToken()
    const res = await app.request('/api/projects/proj-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Renamed', spec_data: { id: 'spec-2' } }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.response_data.name).toBe('My API')
    expect(service.update).toHaveBeenCalledWith('proj-1', { name: 'Renamed', spec_data: { id: 'spec-2' } })
  })

  test('PUT /api/projects/:id returns 400 for invalid JSON', async () => {
    const app = buildApp()
    const token = await makeToken()
    const res = await app.request('/api/projects/proj-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: '{',
    })
    expect(res.status).toBe(400)
  })

  test('DELETE /api/projects/:id deletes project', async () => {
    const service = fakeService()
    const app = buildApp(service)
    const token = await makeToken()
    const res = await app.request('/api/projects/proj-1', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(service.delete).toHaveBeenCalledWith('proj-1', 'user-1')
  })

  test('DELETE /api/projects returns 401 without token', async () => {
    const app = buildApp()
    const res = await app.request('/api/projects/proj-1', { method: 'DELETE' })
    expect(res.status).toBe(401)
  })
})
