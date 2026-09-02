import { z } from 'zod'
import { logger } from './logger'

export const envSchema = z.object({
  PORT: z.coerce.number().default(8888),
  APP_ENV: z.enum(['dev', 'staging', 'production']).default('dev'),
  APP_NAME: z.string().default('hono-boilerplate'),
  API_PREFIX: z.string().default('/api'),
  LOG_LEVEL: z.string().default('debug'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('reel_cut'),
  DB_SSL: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
  BCRYPT_ROUNDS: z.coerce.number().default(10),
  JWT_ISSUER: z.string().default('reel-cut'),
  ALLOWED_ORIGINS: z.string().default('*'),
  CLIENT_URL: z.string().url().optional(),
  ALLOWED_EMAIL_DOMAINS: z.string().default(''),
  GOOGLE_CLIENT_ID: z.string().default(process.env.VITE_GOOGLE_CLIENT_ID ?? ''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  LLM_BASE_URL: z.string().url().optional(),
  LLM_API_KEY: z.string().optional(),
})

export function validateEnv() {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    logger.error(`Invalid environment variables: ${JSON.stringify(parsed.error.issues)}`)
    process.exit(1)
  }
  return parsed.data
}

export const env = validateEnv()
