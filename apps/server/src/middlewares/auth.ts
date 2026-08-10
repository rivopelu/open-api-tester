import type { MiddlewareHandler, Context } from 'hono'
import { verifyToken } from '../lib/jwt-utils'
import { UnauthorizedError } from '../configs/exception'

export type Variables = {
  user: { sub: string }
}

const publicPaths = ['/api/auth/sign-in', '/api/auth/sign-up']

export function authMiddleware(): MiddlewareHandler<{ Variables: Variables }> {
  return async (c: Context<{ Variables: Variables }>, next) => {
    if (publicPaths.includes(c.req.path)) {
      return next()
    }

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
