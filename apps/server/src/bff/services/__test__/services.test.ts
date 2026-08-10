import { describe, expect, test } from 'bun:test'
import { SystemBffService } from '../system-bff.service'

describe('SystemBffService', () => {
  test('ping returns pong', () => {
    const service = new SystemBffService()
    expect(service.ping()).toBe('pong')
  })
})

describe('AuthBffService', () => {
  test('class is importable', async () => {
    const { AuthBffService } = await import('../auth-bff.service')
    expect(AuthBffService).toBeDefined()
  })

  test('signUp delegates to AuthService', async () => {
    const { AuthBffService } = await import('../auth-bff.service')
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
    const { AuthBffService } = await import('../auth-bff.service')
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
