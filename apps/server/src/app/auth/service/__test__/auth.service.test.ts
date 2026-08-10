import { describe, expect, test, mock } from 'bun:test'
import { AuthService } from '../auth.service'
import type { Account } from '../../../account/entity/account.entity'

// Mock jose SignJWT
mock.module('jose', () => ({
  SignJWT: class {
    setProtectedHeader() {
      return this
    }
    setIssuedAt() {
      return this
    }
    setIssuer() {
      return this
    }
    setExpirationTime() {
      return this
    }
    sign() {
      return Promise.resolve('mocked-jwt')
    }
  },
}))

// Mock bcryptjs
mock.module('bcryptjs', () => ({
  hash: () => Promise.resolve('hashed-password'),
  compare: () => Promise.resolve(true),
}))

describe('AuthService', () => {
  const mockAccount: Account = {
    id: 'acc-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
    profile_picture: 'https://ui-avatars.com/api/?name=Test+User&background=random',
    active: true,
    created_date: 1000,
    created_by: null,
    updated_date: null,
    updated_by: null,
    deleted_date: null,
    deleted_by: null,
  }

  function createAuthService(
    stubs: Partial<{
      findByEmail: (email: string) => Promise<Account | null>
      create: (data: any) => Promise<Account>
    }>,
  ) {
    const mockAccountService = {
      findByEmail: stubs.findByEmail!,
      create: stubs.create ?? (async (data) => ({ ...mockAccount, ...data })),
    } as any
    return new AuthService(mockAccountService)
  }

  describe('signUp', () => {
    test('creates account and returns token', async () => {
      const create = mock(async (data: any) => ({ ...mockAccount, ...data }))
      const service = createAuthService({ findByEmail: async () => null, create })
      const result = await service.signUp({
        email: 'new@example.com',
        name: 'New User',
        password: 'secret123',
      })
      expect(result.access_token).toBe('mocked-jwt')
      expect(result.account.email).toBe('new@example.com')
      expect(result.account.name).toBe('New User')
      expect(create).toHaveBeenCalledTimes(1)
    })

    test('throws when email already registered', async () => {
      const service = createAuthService({ findByEmail: async () => mockAccount })
      expect(
        service.signUp({ email: 'test@example.com', name: 'Test', password: 'secret123' }),
      ).rejects.toThrow('Email already registered')
    })
  })

  describe('signIn', () => {
    test('returns token for valid credentials', async () => {
      const service = createAuthService({ findByEmail: async () => mockAccount })
      const result = await service.signIn({
        email: 'test@example.com',
        password: 'correct-password',
      })
      expect(result.access_token).toBe('mocked-jwt')
      expect(result.account.email).toBe('test@example.com')
    })

    test('throws when account not found', async () => {
      const service = createAuthService({ findByEmail: async () => null })
      expect(service.signIn({ email: 'unknown@example.com', password: 'pw' })).rejects.toThrow(
        'Invalid email or password',
      )
    })

    test('throws when account is deactivated', async () => {
      const inactive = { ...mockAccount, active: false }
      const service = createAuthService({ findByEmail: async () => inactive })
      expect(service.signIn({ email: 'test@example.com', password: 'pw' })).rejects.toThrow(
        'Account is deactivated',
      )
    })

    test('signUp uses default create when no create stub', async () => {
      const service = createAuthService({ findByEmail: async () => null })
      const result = await service.signUp({
        email: 'default@example.com',
        name: 'Default',
        password: 'pw',
      })
      expect(result.access_token).toBe('mocked-jwt')
      expect(result.account.email).toBe('default@example.com')
    })
  })
})
