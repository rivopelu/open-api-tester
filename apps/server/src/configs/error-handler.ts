import type { Context } from 'hono'
import { ZodError } from 'zod'
import { AppError, ValidationError } from './exception'
import { logger } from './logger'

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    const appErr = err as AppError
    logger.warn(`${c.req.method} ${c.req.path} ${appErr.statusCode} - ${appErr.message}`)
    return c.json(
      {
        success: false,
        message: appErr.message,
        ...(appErr.errors ? { errors: appErr.errors } : {}),
      },
      appErr.statusCode as Parameters<typeof c.json>[1],
    )
  }

  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))
    logger.warn(`${c.req.method} ${c.req.path} 422 - Validation failed`)
    return c.json(
      {
        success: false,
        message: 'Validation failed',
        errors,
      },
      422,
    )
  }

  logger.error(`Unhandled: ${c.req.method} ${c.req.path} - ${err.message}`)
  return c.json({ success: false, message: 'Internal Server Error' }, 500)
}
