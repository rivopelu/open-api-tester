import { describe, expect, test } from 'bun:test'
import type { CreateAccountInput } from '../account.types'

describe('Account types', () => {
  test('CreateAccountInput shape is correct', () => {
    const input: CreateAccountInput = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed-password',
      created_by: 'test@example.com',
    }
    expect(input.email).toBe('test@example.com')
    expect(input.name).toBe('Test User')
    expect(input.password).toBe('hashed-password')
    expect(input.profile_picture).toBeUndefined()
  })
})
