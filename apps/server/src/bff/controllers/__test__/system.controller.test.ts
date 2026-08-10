import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { systemController } from '../system.controller'
import { registerControllers } from '../../../lib/decorators'
import { errorHandler } from '../../../configs/error-handler'

describe('SystemController', () => {
  const app = new Hono()
  app.onError(errorHandler)
  registerControllers(app, [systemController], '/api')

  test('GET /api/ping returns ok', async () => {
    const res = await app.request('/api/ping')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.message).toBe('success')
    expect(body.response_data).toBe('pong')
  })

  test('GET /api/bad-request returns 400', async () => {
    const res = await app.request('/api/bad-request')
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.message).toBe('Invalid input provided')
  })

  test('GET /api/unauthorized returns 401', async () => {
    const res = await app.request('/api/unauthorized')
    expect(res.status).toBe(401)
  })

  test('GET /api/forbidden returns 403', async () => {
    const res = await app.request('/api/forbidden')
    expect(res.status).toBe(403)
  })

  test('GET /api/not-found returns 404', async () => {
    const res = await app.request('/api/not-found')
    expect(res.status).toBe(404)
  })

  test('POST /api/conflict returns 409', async () => {
    const res = await app.request('/api/conflict', { method: 'POST' })
    expect(res.status).toBe(409)
  })

  test('POST /api/validation-error returns 422 with errors', async () => {
    const res = await app.request('/api/validation-error', { method: 'POST' })
    expect(res.status).toBe(422)

    const body = await res.json()
    expect(body.errors).toHaveLength(2)
    expect(body.errors[0].field).toBe('email')
  })

  test('GET /api/internal-error returns 500', async () => {
    const res = await app.request('/api/internal-error')
    expect(res.status).toBe(500)
  })

  test('GET /unknown-route returns 404', async () => {
    const res = await app.request('/api/nonexistent')
    expect(res.status).toBe(404)
  })
})
