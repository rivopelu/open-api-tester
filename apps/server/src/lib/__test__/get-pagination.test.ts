import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { getPagination } from '../get-pagination'

describe('getPagination', () => {
  test('returns defaults when no query params', async () => {
    const app = new Hono()
    app.get('/test', (c) => {
      const p = getPagination(c)
      return c.json(p)
    })
    const res = await app.request('/test')
    const body = await res.json()
    expect(body.page).toBe(0)
    expect(body.size).toBe(20)
    expect(body.q).toBeUndefined()
    expect(body.sort).toBeUndefined()
    expect(body.order).toBeUndefined()
  })

  test('parses all params', async () => {
    const app = new Hono()
    app.get('/test', (c) => {
      const p = getPagination(c)
      return c.json(p)
    })
    const res = await app.request('/test?page=2&size=15&q=foo&sort=name&order=asc')
    const body = await res.json()
    expect(body.page).toBe(2)
    expect(body.size).toBe(15)
    expect(body.q).toBe('foo')
    expect(body.sort).toBe('name')
    expect(body.order).toBe('asc')
  })

  test('clamps size to max 100', async () => {
    const app = new Hono()
    app.get('/test', (c) => {
      const p = getPagination(c)
      return c.json(p)
    })
    const res = await app.request('/test?size=999')
    const body = await res.json()
    expect(body.size).toBe(100)
  })

  test('rejects invalid order', async () => {
    const app = new Hono()
    app.get('/test', (c) => {
      const p = getPagination(c)
      return c.json(p)
    })
    const res = await app.request('/test?order=invalid')
    const body = await res.json()
    expect(body.order).toBeUndefined()
  })
})
