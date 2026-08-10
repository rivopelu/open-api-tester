import { describe, expect, test } from 'bun:test'
import { AccountRepository } from '../account.repository'

function selectMock(result: unknown[]) {
  return {
    select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve(result) }) }) }),
  }
}

function insertMock(result: unknown) {
  return { insert: () => ({ values: () => ({ returning: () => Promise.resolve([result]) }) }) }
}

function insertErrorMock(err: Error) {
  return { insert: () => ({ values: () => ({ returning: () => Promise.reject(err) }) }) }
}

function updateMock(result: unknown) {
  return {
    update: () => ({
      set: () => ({ where: () => ({ returning: () => Promise.resolve([result]) }) }),
    }),
  }
}

function updateErrorMock(err: Error) {
  return {
    update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.reject(err) }) }) }),
  }
}

describe('AccountRepository', () => {
  test('findByEmail returns null when not found', async () => {
    const repo = new AccountRepository(selectMock([]) as any)
    const result = await repo.findByEmail('missing@example.com')
    expect(result).toBeNull()
  })

  test('findByEmail returns account when found', async () => {
    const mockAccount = {
      id: 'acc-1',
      email: 'test@example.com',
      name: 'Test',
      password: 'hash',
      profile_picture: null,
      active: true,
      created_date: 1000,
      created_by: null,
      updated_date: null,
      updated_by: null,
      deleted_date: null,
      deleted_by: null,
    }
    const repo = new AccountRepository(selectMock([mockAccount]) as any)
    const result = await repo.findByEmail('test@example.com')
    expect(result).toEqual(mockAccount)
  })

  test('insert returns created account', async () => {
    const mockAccount = {
      id: 'acc-1',
      email: 'test@example.com',
      name: 'Test',
      password: 'hash',
      profile_picture: null,
      active: true,
      created_date: 1000,
      created_by: 'system',
      updated_date: null,
      updated_by: null,
      deleted_date: null,
      deleted_by: null,
    }
    const repo = new AccountRepository(insertMock(mockAccount) as any)
    const result = await repo.insert({
      email: 'test@example.com',
      name: 'Test',
      password: 'hash',
      created_by: 'system',
    })
    expect(result.id).toBe('acc-1')
    expect(result.email).toBe('test@example.com')
  })

  test('insert throws when insert fails', async () => {
    const repo = new AccountRepository(insertErrorMock(new Error('DB error')) as any)
    expect(
      repo.insert({
        email: 'test@example.com',
        name: 'Test',
        password: 'hash',
        created_by: 'system',
      }),
    ).rejects.toThrow('DB error')
  })

  test('findById returns null when not found', async () => {
    const repo = new AccountRepository(selectMock([]) as any)
    const result = await repo.findById('nonexistent')
    expect(result).toBeNull()
  })

  test('findById returns account when found', async () => {
    const mockAccount = {
      id: 'acc-1',
      email: 'test@example.com',
      name: 'Test',
      password: 'hash',
      profile_picture: null,
      active: true,
      created_date: 1000,
      created_by: null,
      updated_date: null,
      updated_by: null,
      deleted_date: null,
      deleted_by: null,
    }
    const repo = new AccountRepository(selectMock([mockAccount]) as any)
    const result = await repo.findById('acc-1')
    expect(result).toEqual(mockAccount)
  })

  test('update returns updated account', async () => {
    const mockAccount = {
      id: 'acc-1',
      email: 'test@example.com',
      name: 'Updated',
      password: 'hash',
      profile_picture: null,
      active: true,
      created_date: 1000,
      created_by: null,
      updated_date: 2000,
      updated_by: null,
      deleted_date: null,
      deleted_by: null,
    }
    const repo = new AccountRepository(updateMock(mockAccount) as any)
    const result = await repo.update('acc-1', { name: 'Updated' })
    expect(result.updated_date).toBe(2000)
  })

  test('update throws when update fails', async () => {
    const repo = new AccountRepository(updateErrorMock(new Error('DB error')) as any)
    expect(repo.update('acc-1', { name: 'Updated' })).rejects.toThrow('DB error')
  })
})
