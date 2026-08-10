import { describe, expect, test, mock } from 'bun:test'
import { AccountService } from '../service/account.service'
import type { AccountRepository } from '../repository/account.repository'

describe('AccountService', () => {
  test('list delegates to repository.findAll', async () => {
    const expected = { items: [], total: 0 }
    const mockRepo = {
      findAll: mock(() => Promise.resolve(expected)),
    } as unknown as AccountRepository

    const service = new AccountService(mockRepo)
    const result = await service.list({ page: 0, size: 10 })

    expect(result).toEqual(expected)
    expect(mockRepo.findAll).toHaveBeenCalledWith({ page: 0, size: 10 })
  })

  test('list passes search query to repository', async () => {
    const mockRepo = {
      findAll: mock(() => Promise.resolve({ items: [], total: 0 })),
    } as unknown as AccountRepository

    const service = new AccountService(mockRepo)
    await service.list({ page: 1, size: 5, q: 'test', sort: 'name', order: 'asc' })

    expect(mockRepo.findAll).toHaveBeenCalledWith({
      page: 1,
      size: 5,
      q: 'test',
      sort: 'name',
      order: 'asc',
    })
  })
})
