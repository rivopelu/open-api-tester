export interface PaginationQuery {
  page: number
  size: number
  q?: string
  sort?: string
  order?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
}
