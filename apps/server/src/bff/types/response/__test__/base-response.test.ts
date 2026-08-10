import { describe, expect, test } from 'bun:test'
import type { BaseResponse, IPaginationDataResponse } from '../base-response'

describe('BaseResponse type', () => {
  test('success response satisfies interface', () => {
    const res: BaseResponse<null> = { success: true, message: 'ok' }
    expect(res.success).toBe(true)
    expect(res.message).toBe('ok')
  })

  test('response with data satisfies interface', () => {
    const res: BaseResponse<{ id: number }> = {
      success: true,
      message: 'found',
      response_data: { id: 1 },
    }
    expect(res.response_data?.id).toBe(1)
  })

  test('response with pagination satisfies interface', () => {
    const paginated: IPaginationDataResponse = {
      page: 2,
      size: 20,
      total_data: 100,
      page_count: 5,
    }
    const res: BaseResponse<string[]> = {
      success: true,
      message: 'paginated',
      response_data: ['a', 'b'],
      paginated_data: paginated,
    }
    expect(res.paginated_data?.page_count).toBe(5)
  })

  test('error response satisfies interface', () => {
    const res: BaseResponse<null> = {
      success: false,
      message: 'error ocurred',
      errors: [{ field: 'name' }],
    }
    expect(res.success).toBe(false)
    expect(res.errors).toHaveLength(1)
  })
})
