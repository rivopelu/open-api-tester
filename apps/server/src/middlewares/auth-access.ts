import type { MiddlewareHandler, Context } from 'hono'
import { verifyToken } from '../lib/jwt-utils'
import { UnauthorizedError } from '../configs/exception'

export type Variables = {
  user: { sub: string }
}

export function authAccessMiddleware(): MiddlewareHandler<{ Variables: Variables }> {
  return async (c: Context<{ Variables: Variables }>, next) => {
    const auth = c.req.header('Authorization')
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid token')
    }

    try {
      const payload = await verifyToken(auth.slice(7))
      c.set('user', payload)
    } catch {
      throw new UnauthorizedError('Invalid or expired token')
    }

    await next()
  }
}
