import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { authMiddleware } from '../auth'
import { errorHandler } from '../../configs/error-handler'

describe('authMiddleware', () => {
  function createApp() {
    const app = new Hono()
    app.onError(errorHandler)
    app.use('/api/auth/*', authMiddleware())
    return app
  }

  test('passes through for public paths', async () => {
    const app = createApp()
    app.get('/api/auth/sign-in', (c) => c.json({ ok: true }))

    const res = await app.request('/api/auth/sign-in')
    expect(res.status).toBe(200)
  })

  test('returns 401 when no Authorization header', async () => {
    const app = createApp()
    app.get('/api/auth/me', (c) => c.json({ ok: true }))

    const res = await app.request('/api/auth/me')
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.message).toBe('Missing or invalid token')
  })

  test('returns 401 for invalid token', async () => {
    const app = createApp()
    app.get('/api/auth/me', (c) => c.json({ ok: true }))

    const res = await app.request('/api/auth/me', {
      headers: { Authorization: 'Bearer invalid-token' },
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.message).toBe('Invalid or expired token')
  })
})
