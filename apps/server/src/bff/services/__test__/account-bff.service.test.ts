import { describe, expect, test, vi } from 'vitest'
import { AccountBffService } from '../account-bff.service'
import type { AccountService } from '../../../app/account/service/account.service'

describe('AccountBffService', () => {
  test('list delegates to accountService.list', async () => {
    const expected = { items: [], total: 0 }
    const mockService = {
      list: vi.fn(() => Promise.resolve(expected)),
    } as unknown as AccountService

    const bff = new AccountBffService(mockService)
    const result = await bff.list({ page: 0, size: 20 })

    expect(result).toEqual(expected)
    expect(mockService.list).toHaveBeenCalledWith({ page: 0, size: 20 })
  })
})
