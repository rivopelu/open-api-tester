import { describe, expect, test } from 'bun:test'
import { corsConfig } from '../cors'

describe('corsConfig', () => {
  test('has required properties', () => {
    expect(corsConfig.origin).toBeDefined()
    expect(corsConfig.allowMethods).toContain('GET')
    expect(corsConfig.allowHeaders).toContain('Authorization')
    expect(corsConfig.exposeHeaders).toContain('X-Request-Id')
    expect(corsConfig.maxAge).toBe(86400)
  })
})
