import { env } from './env'

const raw = env.ALLOWED_ORIGINS
const isWildcard = raw === '*'
const allowedOrigins = isWildcard
  ? '*'
  : raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

export const corsConfig = {
  origin: allowedOrigins,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['X-Request-Id'],
  credentials: !isWildcard,
  maxAge: 86400,
}
