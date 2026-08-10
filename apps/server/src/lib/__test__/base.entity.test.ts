import { describe, expect, test } from 'bun:test'

describe('base.entity', () => {
  test('generateEntityId returns a 32-char hex string', async () => {
    const { generateEntityId } = await import('../base.entity')
    const id = generateEntityId()
    expect(id).toHaveLength(32)
    expect(id).toMatch(/^[0-9a-f]+$/)
  })

  test('nowTimestamp returns current time in ms', async () => {
    const { nowTimestamp } = await import('../base.entity')
    const ts = nowTimestamp()
    expect(typeof ts).toBe('number')
    expect(ts).toBeGreaterThan(0)
  })
})
