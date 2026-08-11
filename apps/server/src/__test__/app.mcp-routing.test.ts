import { describe, expect, test } from 'vitest'
import app from '../app'

describe('MCP routing', () => {
  test('exposes the MCP transport under the deployed API prefix', async () => {
    const response = await app.request('/api/mcp')

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid MCP token' })
  })
})
