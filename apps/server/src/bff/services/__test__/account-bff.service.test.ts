import { describe, expect, test, mock } from 'bun:test'
import { AccountBffService } from '../account-bff.service'
import type { AccountService } from '../../../app/account/service/account.service'

describe('AccountBffService', () => {
  test('list delegates to accountService.list', async () => {
    const expected = { items: [], total: 0 }
    const mockService = {
      list: mock(() => Promise.resolve(expected)),
    } as unknown as AccountService

    const bff = new AccountBffService(mockService)
    const result = await bff.list({ page: 0, size: 20 })

    expect(result).toEqual(expected)
    expect(mockService.list).toHaveBeenCalledWith({ page: 0, size: 20 })
  })
})
