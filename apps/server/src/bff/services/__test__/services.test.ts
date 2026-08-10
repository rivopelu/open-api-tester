import { describe, expect, test } from 'vitest'
import { AuthBffService } from '../auth-bff.service'
import { SystemBffService } from '../system-bff.service'

describe('SystemBffService', () => {
  test('ping returns pong', () => {
    const service = new SystemBffService()
    expect(service.ping()).toBe('pong')
  })
})

describe('AuthBffService', () => {
  test('class is importable', () => {
    expect(AuthBffService).toBeDefined()
  })

  test('signUp delegates to AuthService', async () => {
    const service = new AuthBffService({
      signUp: () =>
        Promise.resolve({
          access_token: 'tok',
          account: { id: '1', email: 'a@b.com', name: 'A', profile_picture: null },
        }),
    } as any)
    const result = await service.signUp({ email: 'a@b.com', name: 'A', password: 'pass' })
    expect(result.access_token).toBe('tok')
    expect(result.account.name).toBe('A')
  })

  test('signIn delegates to AuthService', async () => {
    const service = new AuthBffService({
      signIn: () =>
        Promise.resolve({
          access_token: 'tok2',
          account: { id: '2', email: 'b@b.com', name: 'B', profile_picture: null },
        }),
    } as any)
    const result = await service.signIn({ email: 'b@b.com', password: 'pass' })
    expect(result.access_token).toBe('tok2')
    expect(result.account.id).toBe('2')
  })
})
