import { describe, expect, test } from 'bun:test'
import { ResponseHelper } from '../response-helper'

describe('ResponseHelper', () => {
  test('success() returns ok message', () => {
    const res = ResponseHelper.success()
    expect(res).toEqual({ success: true, message: 'ok' })
  })

  test('success() accepts custom message', () => {
    const res = ResponseHelper.success('custom ok')
    expect(res).toEqual({ success: true, message: 'custom ok' })
  })

  test('data() wraps payload', () => {
    const res = ResponseHelper.data({ id: 1, name: 'test' })
    expect(res.success).toBe(true)
    expect(res.response_data).toEqual({ id: 1, name: 'test' })
  })

  test('data() uses default message', () => {
    const res = ResponseHelper.data('value')
    expect(res.message).toBe('success')
  })

  test('paginated() returns correct structure', () => {
    const items = ['a', 'b', 'c']
    const res = ResponseHelper.paginated(items, { page: 1, size: 10, totalData: 25 })

    expect(res.success).toBe(true)
    expect(res.response_data).toEqual(items)
    expect(res.paginated_data).toEqual({
      page: 1,
      size: 10,
      total_data: 25,
      page_count: 3,
    })
  })

  test('paginated() handles exact page count', () => {
    const res = ResponseHelper.paginated([], { page: 1, size: 5, totalData: 15 })
    expect(res.paginated_data?.page_count).toBe(3)
  })

  test('paginated() handles zero total', () => {
    const res = ResponseHelper.paginated([], { page: 1, size: 10, totalData: 0 })
    expect(res.paginated_data?.page_count).toBe(0)
  })

  test('error() returns error envelope', () => {
    const res = ResponseHelper.error('something went wrong')
    expect(res).toEqual({ success: false, message: 'something went wrong', errors: undefined })
  })

  test('error() accepts status and errors', () => {
    const err = { field: 'email', detail: 'invalid' }
    const res = ResponseHelper.error('validation failed', 422, err)
    expect(res.success).toBe(false)
    expect(res.message).toBe('validation failed')
    expect(res.errors).toEqual(err)
  })
})
