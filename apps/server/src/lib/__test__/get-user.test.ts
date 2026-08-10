import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { getUser } from '../get-user'
import type { Variables } from '../../middlewares/auth'

describe('getUser', () => {
  test('returns undefined when user not set', async () => {
    const app = new Hono<{ Variables: Variables }>()
    app.get('/test', (c) => {
      const user = getUser(c)
      return c.json({ found: !!user })
    })
    const res = await app.request('/test')
    const body = await res.json()
    expect(body.found).toBe(false)
  })

  test('returns user when set via middleware', async () => {
    const app = new Hono<{ Variables: Variables }>()
    app.use('/test', (c, next) => {
      c.set('user', { sub: 'abc-123' })
      return next()
    })
    app.get('/test', (c) => {
      const user = getUser(c)
      return c.json({ sub: user?.sub })
    })
    const res = await app.request('/test')
    const body = await res.json()
    expect(body.sub).toBe('abc-123')
  })
})
