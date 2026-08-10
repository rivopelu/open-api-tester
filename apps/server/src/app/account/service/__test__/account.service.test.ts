import { describe, expect, test, mock } from 'bun:test'
import { AccountService } from '../account.service'
import type { Account } from '../../entity/account.entity'

describe('AccountService', () => {
  const mockAccount: Account = {
    id: 'acc-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed',
    profile_picture: null,
    active: true,
    created_date: 1000,
    created_by: null,
    updated_date: null,
    updated_by: null,
    deleted_date: null,
    deleted_by: null,
  }

  function createService(
    stubs: Partial<{
      findByEmail: (email: string) => Promise<Account | null>
      findById: (id: string) => Promise<Account | null>
      insert: (input: any) => Promise<Account>
    }>,
  ) {
    const mockRepo = {
      findByEmail: stubs.findByEmail ?? (async () => null),
      findById: stubs.findById ?? (async () => null),
      insert: stubs.insert ?? (async (input) => ({ ...mockAccount, ...input })),
    } as any
    return new AccountService(mockRepo)
  }

  test('findByEmail returns account when found', async () => {
    const service = createService({ findByEmail: async () => mockAccount })
    const result = await service.findByEmail('test@example.com')
    expect(result?.email).toBe('test@example.com')
  })

  test('findByEmail returns null when not found', async () => {
    const service = createService({ findByEmail: async () => null })
    const result = await service.findByEmail('missing@example.com')
    expect(result).toBeNull()
  })

  test('findById returns account when found', async () => {
    const service = createService({ findById: async () => mockAccount })
    const result = await service.findById('acc-1')
    expect(result?.id).toBe('acc-1')
  })

  test('findById returns null when not found', async () => {
    const service = createService({ findById: async () => null })
    const result = await service.findById('missing')
    expect(result).toBeNull()
  })

  test('create inserts a new account', async () => {
    const insert = mock(async (input: any) => ({ ...mockAccount, ...input }))
    const service = createService({ insert })
    const result = await service.create({
      email: 'new@example.com',
      name: 'New User',
      password: 'hashed-pw',
      created_by: 'admin',
    })
    expect(result.email).toBe('new@example.com')
    expect(result.name).toBe('New User')
    expect(insert).toHaveBeenCalledTimes(1)
  })

  test('findById uses default null when no stub', async () => {
    const service = createService({})
    const result = await service.findById('any')
    expect(result).toBeNull()
  })

  test('create uses default insert when no insert stub', async () => {
    const service = createService({ findByEmail: async () => null })
    const result = await service.create({
      email: 'default@example.com',
      name: 'Default',
      password: 'pw',
      created_by: 'test',
    })
    expect(result.email).toBe('default@example.com')
  })
})
