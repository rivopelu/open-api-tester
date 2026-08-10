import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { requestLogger } from '../request-logger'
import { errorHandler } from '../../configs/error-handler'

describe('requestLogger middleware', () => {
  test('sets X-Request-Id header', async () => {
    const app = new Hono()
    app.use('*', requestLogger())
    app.get('/test', (c) => c.text('ok'))
    const res = await app.request('/test')
    expect(res.status).toBe(200)
    expect(res.headers.has('X-Request-Id')).toBe(true)
    expect(res.headers.get('X-Request-Id')).toHaveLength(8)
  })

  test('returns normal response', async () => {
    const app = new Hono()
    app.use('*', requestLogger())
    app.get('/test', (c) => c.text('ok'))
    const res = await app.request('/test')
    expect(await res.text()).toBe('ok')
  })

  test('handles 404 paths', async () => {
    const app = new Hono()
    app.use('*', requestLogger())
    const res = await app.request('/notfound')
    expect(res.status).toBe(404)
    expect(res.headers.has('X-Request-Id')).toBe(true)
  })

  test('handles 500 errors', async () => {
    const app = new Hono()
    app.use('*', requestLogger())
    app.onError(errorHandler)
    app.get('/error', () => {
      throw new Error('server error')
    })
    const res = await app.request('/error')
    expect(res.status).toBe(500)
    expect(res.headers.has('X-Request-Id')).toBe(true)
  })

  test('handles slow requests with warn log', async () => {
    const app = new Hono()
    app.use('*', requestLogger())
    app.get('/slow', async (c) => {
      await new Promise((r) => setTimeout(r, 600))
      return c.text('slow')
    })
    const res = await app.request('/slow')
    expect(res.status).toBe(200)
  })

  test('handles long user-agent header', async () => {
    const app = new Hono()
    app.use('*', requestLogger())
    app.get('/test', (c) => c.text('ok'))
    const longUA = 'A'.repeat(100)
    const res = await app.request('/test', {
      headers: { 'User-Agent': longUA },
    })
    expect(res.status).toBe(200)
  })
})
