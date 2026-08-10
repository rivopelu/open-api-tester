import { describe, expect, test } from 'bun:test'
import type { SignUpInput, SignInInput, AuthResult } from '../auth.types'

describe('Auth types', () => {
  test('SignUpInput shape is correct', () => {
    const input: SignUpInput = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'secret123',
    }
    expect(input.email).toBe('test@example.com')
    expect(input.name).toBe('Test User')
    expect(input.password).toBe('secret123')
  })

  test('SignInInput shape is correct', () => {
    const input: SignInInput = {
      email: 'test@example.com',
      password: 'secret123',
    }
    expect(input.email).toBe('test@example.com')
    expect(input.password).toBe('secret123')
  })

  test('AuthResult shape is correct', () => {
    const result: AuthResult = {
      access_token: 'jwt-token',
      account: {
        id: 'abc123',
        email: 'test@example.com',
        name: 'Test User',
        profile_picture: 'https://example.com/avatar.png',
      },
    }
    expect(result.access_token).toBe('jwt-token')
    expect(result.account.id).toBe('abc123')
  })
})
