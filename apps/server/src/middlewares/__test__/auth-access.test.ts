import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { authAccessMiddleware } from '../auth-access'
import { errorHandler } from '../../configs/error-handler'

describe('authAccessMiddleware', () => {
  function createApp() {
    const app = new Hono()
    app.onError(errorHandler)
    app.get('/protected', authAccessMiddleware(), (c) => c.json({ ok: true }))
    return app
  }

  test('returns 401 when no Authorization header', async () => {
    const app = createApp()
    const res = await app.request('/protected')
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.message).toBe('Missing or invalid token')
  })

  test('returns 401 for invalid token', async () => {
    const app = createApp()
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer invalid-token' },
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.message).toBe('Invalid or expired token')
  })

  test('returns 401 for malformed Authorization header', async () => {
    const app = createApp()
    const res = await app.request('/protected', {
      headers: { Authorization: 'NotBearer token' },
    })
    expect(res.status).toBe(401)
  })

  test('passes through for valid token', async () => {
    const { SignJWT } = await import('jose')
    const secret = new TextEncoder().encode('dev-secret-change-in-production')
    const token = await new SignJWT({ sub: 'test-id' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('reel-cut')
      .setExpirationTime('1h')
      .sign(secret)

    const app = createApp()
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
