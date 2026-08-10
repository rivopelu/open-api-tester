import type { PaginationQuery, PaginatedResult } from '../../../lib/pagination'

export interface CreateAccountInput {
  email: string
  name: string
  password: string
  profile_picture?: string
  created_by: string
}

export type AccountListQuery = PaginationQuery

export interface AccountItem {
  id: string
  email: string
  name: string
  profile_picture: string | null
  active: boolean
  created_date: number
}

export type AccountListResult = PaginatedResult<AccountItem>
