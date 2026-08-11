import { afterEach, describe, expect, test, vi } from 'vitest'
import { AuthService } from '../auth.service'
import type { Account } from '../../../account/entity/account.entity'
import { env } from '../../../../configs/env'

// Mock jose SignJWT
vi.mock('jose', () => ({
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
vi.mock('bcryptjs', () => ({
  hash: () => Promise.resolve('hashed-password'),
  compare: () => Promise.resolve(true),
}))

describe('AuthService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    env.ALLOWED_EMAIL_DOMAINS = ''
  })
  const mockAccount: Account = {
    id: 'acc-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
    profile_picture: 'https://ui-avatars.com/api/?name=Test+User&background=random',
    mcp_token_hash: null,
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
      updateProfilePicture: (id: string, picture: string) => Promise<Account>
    }>,
  ) {
    const mockAccountService = {
      findByEmail: stubs.findByEmail!,
      create: stubs.create ?? (async (data) => ({ ...mockAccount, ...data })),
      updateProfilePicture:
        stubs.updateProfilePicture ??
        (async (id, picture) => ({ ...mockAccount, id, profile_picture: picture })),
    } as any
    return new AuthService(mockAccountService)
  }

  describe('signInWithGoogle', () => {
    test('creates an allowed Google account on first sign-in', async () => {
      env.ALLOWED_EMAIL_DOMAINS = 'maxxiagri.id'
      const create = vi.fn(async (data: any) => ({ ...mockAccount, ...data }))
      const service = createAuthService({ findByEmail: async () => null, create })
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ access_token: 'google-token' }), { status: 200 }),
          )
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify({
                email: 'user@maxxiagri.id',
                email_verified: true,
                name: 'Google User',
                picture: 'https://example.com/user.jpg',
              }),
              { status: 200 },
            ),
          ),
      )

      const result = await service.signInWithGoogle('code', 'http://localhost/callback')

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@maxxiagri.id', name: 'Google User' }),
      )
      expect(result.access_token).toBe('mocked-jwt')
    })

    test('rejects Google accounts outside allowed domains', async () => {
      env.ALLOWED_EMAIL_DOMAINS = 'maxxiagri.id'
      const service = createAuthService({ findByEmail: async () => null })
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ access_token: 'google-token' }), { status: 200 }),
          )
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify({ email: 'user@example.com', email_verified: true, name: 'User' }),
              { status: 200 },
            ),
          ),
      )

      await expect(service.signInWithGoogle('code', 'http://localhost/callback')).rejects.toThrow(
        'email domain is not allowed',
      )
    })

    test('backfills profile picture when the account has none', async () => {
      env.ALLOWED_EMAIL_DOMAINS = 'maxxiagri.id'
      const existing = { ...mockAccount, profile_picture: null }
      const updateProfilePicture = vi.fn(async (id: string, picture: string) => ({
        ...existing,
        profile_picture: picture,
      }))
      const service = createAuthService({ findByEmail: async () => existing, updateProfilePicture })
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ access_token: 'google-token' }), { status: 200 }),
          )
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify({
                email: 'user@maxxiagri.id',
                email_verified: true,
                name: 'Google User',
                picture: 'https://example.com/user.jpg',
              }),
              { status: 200 },
            ),
          ),
      )

      const result = await service.signInWithGoogle('code', 'http://localhost/callback')

      expect(updateProfilePicture).toHaveBeenCalledWith('acc-1', 'https://example.com/user.jpg')
      expect(result.account.profile_picture).toBe('https://example.com/user.jpg')
    })

    test('keeps existing profile picture when one is already set', async () => {
      env.ALLOWED_EMAIL_DOMAINS = 'maxxiagri.id'
      const updateProfilePicture = vi.fn()
      const service = createAuthService({
        findByEmail: async () => mockAccount,
        updateProfilePicture,
      })
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ access_token: 'google-token' }), { status: 200 }),
          )
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify({
                email: 'user@maxxiagri.id',
                email_verified: true,
                name: 'Google User',
                picture: 'https://example.com/user.jpg',
              }),
              { status: 200 },
            ),
          ),
      )

      const result = await service.signInWithGoogle('code', 'http://localhost/callback')

      expect(updateProfilePicture).not.toHaveBeenCalled()
      expect(result.account.profile_picture).toBe(mockAccount.profile_picture)
    })
  })

  describe('signUp', () => {
    test('creates account and returns token', async () => {
      const create = vi.fn(async (data: any) => ({ ...mockAccount, ...data }))
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
