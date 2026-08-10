import { Context } from 'hono'

export function getPagination(c: Context) {
  const page = Math.max(0, parseInt(c.req.query('page') ?? '0', 10))
  const size = Math.min(100, Math.max(1, parseInt(c.req.query('size') ?? '20', 10)))
  const q = c.req.query('q') ?? undefined
  const sort = c.req.query('sort') ?? undefined
  const orderRaw = c.req.query('order')
  const order = orderRaw === 'asc' || orderRaw === 'desc' ? orderRaw : undefined

  return { page, size, q, sort, order } as const
}
