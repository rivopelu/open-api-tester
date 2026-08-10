import type { MiddlewareHandler } from 'hono'
import { logger } from '../configs/logger'
import { env } from '../configs/env'
import { getUser } from '../lib/get-user'

export function requestLogger(): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now()
    const { method } = c.req
    const path = c.req.path
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      'unknown'
    const userAgent = c.req.header('user-agent') || ''
    const referer = c.req.header('referer') || ''
    const requestId = crypto.randomUUID().slice(0, 8)

    c.res.headers.set('X-Request-Id', requestId)

    await next()

    const duration = Date.now() - start
    const { status } = c.res
    const user = getUser(c)
    const userLabel = user?.email ?? user?.sub ?? 'anon'

    const logMeta = {
      requestId,
      method,
      path,
      status,
      duration: `${duration}ms`,
      user: userLabel,
      ip,
      userAgent: userAgent.slice(0, 120),
      ...(referer ? { referer } : {}),
    }

    const message = `${method} ${path} ${status} ${duration}ms`

    if (status >= 500) {
      logger.error(message, logMeta)
    } else if (status >= 400) {
      logger.warn(message, logMeta)
    } else if (duration > (env.APP_ENV === 'dev' ? 500 : 1000)) {
      logger.warn(`slow ${message}`, logMeta)
    } else {
      logger.http(message, logMeta)
    }
  }
}
