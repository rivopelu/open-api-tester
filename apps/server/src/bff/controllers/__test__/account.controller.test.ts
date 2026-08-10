import { describe, expect, test, mock, beforeAll } from 'bun:test'
import { Hono } from 'hono'
import { SignJWT } from 'jose'
import { registerControllers } from '../../../lib/decorators'
import { errorHandler } from '../../../configs/error-handler'
import { AccountController } from '../account.controller'
import { env } from '../../../configs/env'

async function createToken(): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET)
  return new SignJWT({ sub: 'test-id' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(env.JWT_ISSUER)
    .setExpirationTime('1h')
    .sign(secret)
}

let app: Hono
let token: string

beforeAll(async () => {
  token = await createToken()

  const mockList = mock(() => Promise.resolve({ items: [], total: 0 }))
  const controller = new AccountController({ list: mockList } as any)

  app = new Hono()
  app.onError(errorHandler)
  registerControllers(app, [controller], '/api')
})

describe('AccountController', () => {
  test('GET /api/accounts returns 401 without token', async () => {
    const res = await app.request('/api/accounts')
    expect(res.status).toBe(401)
  })

  test('GET /api/accounts returns 401 with invalid token', async () => {
    const res = await app.request('/api/accounts', {
      headers: { Authorization: 'Bearer invalid-token' },
    })
    expect(res.status).toBe(401)
  })

  test('GET /api/accounts returns paginated response with valid token', async () => {
    const res = await app.request('/api/accounts', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.response_data)).toBe(true)
    expect(body.paginated_data).toBeDefined()
    expect(body.paginated_data.page).toBe(0)
    expect(body.paginated_data.size).toBe(20)
  })

  test('GET /api/accounts?page=1&size=5 passes query params', async () => {
    const res = await app.request('/api/accounts?page=1&size=5', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.paginated_data.page).toBe(1)
    expect(body.paginated_data.size).toBe(5)
  })

  test('GET /api/accounts?q=test passes search', async () => {
    const res = await app.request('/api/accounts?q=test', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('GET /api/accounts?sort=name&order=asc passes sort params', async () => {
    const res = await app.request('/api/accounts?sort=name&order=asc', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
  })

  test('GET /api/accounts clamps size to max 100', async () => {
    const res = await app.request('/api/accounts?size=999', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.paginated_data.size).toBe(100)
  })
})
