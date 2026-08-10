import { describe, expect, test, mock } from 'bun:test'
import { envSchema, validateEnv } from '../env'

describe('env schema', () => {
  test('applies default values when env vars are missing', () => {
    const parsed = envSchema.safeParse({})
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.PORT).toBe(8888)
    expect(parsed.data.APP_ENV).toBe('dev')
    expect(parsed.data.API_PREFIX).toBe('/api')
    expect(parsed.data.LOG_LEVEL).toBe('debug')
  })

  test('parses PORT as number', () => {
    const parsed = envSchema.safeParse({ PORT: '3000' })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.PORT).toBe(3000)
  })

  test('accepts valid APP_ENV values', () => {
    for (const val of ['dev', 'staging', 'production'] as const) {
      const parsed = envSchema.safeParse({ APP_ENV: val })
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      expect(parsed.data.APP_ENV).toBe(val)
    }
  })

  test('rejects invalid APP_ENV', () => {
    const parsed = envSchema.safeParse({ APP_ENV: 'invalid' })
    expect(parsed.success).toBe(false)
  })

  test('JWT and bcrypt defaults', () => {
    const parsed = envSchema.safeParse({})
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.JWT_SECRET).toBe('dev-secret-change-in-production')
    expect(parsed.data.BCRYPT_ROUNDS).toBe(10)
    expect(parsed.data.JWT_ISSUER).toBe('reel-cut')
    expect(parsed.data.ALLOWED_ORIGINS).toBe('*')
  })

  test('validateEnv throws on invalid APP_ENV', () => {
    const exitMock = mock((_code?: number) => {
      throw new Error('exit')
    })
    const origExit = process.exit
    process.exit = exitMock as any

    const saved = process.env.APP_ENV
    process.env.APP_ENV = 'INVALID_VALUE'

    expect(() => validateEnv()).toThrow('exit')

    process.env.APP_ENV = saved
    process.exit = origExit
  })
})
