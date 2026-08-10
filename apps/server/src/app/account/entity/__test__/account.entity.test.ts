import { describe, expect, test } from 'bun:test'
import { AccountEntity } from '../account.entity'
import type { Account, NewAccount } from '../account.entity'

describe('AccountEntity', () => {
  test('entity and types are exported', () => {
    expect(AccountEntity).toBeDefined()
  })

  test('Account type is valid', () => {
    const account: Account = {
      id: 'abc',
      email: 'test@example.com',
      name: 'Test',
      password: 'hash',
      profile_picture: null,
      active: true,
      created_date: 123,
      created_by: null,
      updated_date: null,
      updated_by: null,
      deleted_date: null,
      deleted_by: null,
    }
    expect(account.email).toBe('test@example.com')
  })

  test('NewAccount type is valid', () => {
    const input: NewAccount = {
      email: 'new@example.com',
      name: 'New',
      password: 'hash',
      created_by: 'admin',
    }
    expect(input.name).toBe('New')
  })
})
