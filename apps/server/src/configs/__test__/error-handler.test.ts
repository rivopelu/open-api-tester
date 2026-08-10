import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { z } from 'zod'
import { errorHandler } from '../error-handler'
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
} from '../exception'

function createApp() {
  const app = new Hono()
  app.onError(errorHandler)
  return app
}

describe('errorHandler', () => {
  test('handles BadRequestError with 400', async () => {
    const app = createApp()
    app.get('/test', () => {
      throw new BadRequestError('bad input')
    })
    const res = await app.request('/test')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.message).toBe('bad input')
  })

  test('handles UnauthorizedError with 401', async () => {
    const app = createApp()
    app.get('/test', () => {
      throw new UnauthorizedError()
    })
    const res = await app.request('/test')
    expect(res.status).toBe(401)
  })

  test('handles ForbiddenError with 403', async () => {
    const app = createApp()
    app.get('/test', () => {
      throw new ForbiddenError()
    })
    const res = await app.request('/test')
    expect(res.status).toBe(403)
  })

  test('handles NotFoundError with 404', async () => {
    const app = createApp()
    app.get('/test', () => {
      throw new NotFoundError()
    })
    const res = await app.request('/test')
    expect(res.status).toBe(404)
  })

  test('handles ConflictError with 409', async () => {
    const app = createApp()
    app.get('/test', () => {
      throw new ConflictError()
    })
    const res = await app.request('/test')
    expect(res.status).toBe(409)
  })

  test('handles ValidationError with 422 and errors', async () => {
    const app = createApp()
    app.get('/test', () => {
      throw new ValidationError('invalid', [{ field: 'email' }])
    })
    const res = await app.request('/test')
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.errors).toHaveLength(1)
  })

  test('handles InternalServerError with 500', async () => {
    const app = createApp()
    app.get('/test', () => {
      throw new InternalServerError()
    })
    const res = await app.request('/test')
    expect(res.status).toBe(500)
  })

  test('handles non-AppError as 500', async () => {
    const app = createApp()
    app.get('/test', () => {
      throw new Error('unexpected')
    })
    const res = await app.request('/test')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.message).toBe('Internal Server Error')
  })

  test('handles ZodError as 422 with structured errors', async () => {
    const app = createApp()
    const schema = z.object({ email: z.string().email() })
    app.get('/test', (_c) => {
      const result = schema.safeParse({ email: 'invalid' })
      if (!result.success) throw result.error
      return new Response('ok')
    })
    const res = await app.request('/test')
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.message).toBe('Validation failed')
    expect(body.errors).toBeDefined()
    expect(body.errors[0].path).toBe('email')
  })
})
