import { describe, expect, test, mock } from 'bun:test'
import { Hono } from 'hono'
import { authController } from '../auth.controller'
import { registerControllers } from '../../../lib/decorators'
import { errorHandler } from '../../../configs/error-handler'
import { authMiddleware } from '../../../middlewares/auth'

describe('AuthController', () => {
  const app = new Hono()
  app.onError(errorHandler)
  app.use('/api/auth/*', authMiddleware())
  registerControllers(app, [authController], '/api')

  test('POST /api/auth/sign-up validates body', async () => {
    const res = await app.request('/api/auth/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid', password: '12' }),
    })
    expect(res.status).toBe(422)
  })

  test('POST /api/auth/sign-in validates body', async () => {
    const res = await app.request('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(422)
  })

  test('GET /api/auth/me returns 401 without token', async () => {
    const res = await app.request('/api/auth/me')
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.message).toBe('Missing or invalid token')
  })

  test('GET /api/auth/me returns 401 with invalid token', async () => {
    const res = await app.request('/api/auth/me', {
      headers: { Authorization: 'Bearer invalid-token' },
    })
    expect(res.status).toBe(401)
  })
})
