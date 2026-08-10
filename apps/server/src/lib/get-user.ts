import { Context } from 'hono'

export type UserContext = { sub: string; email?: string }

export function getUser(c: Context): UserContext | undefined {
  return c.get('user') as UserContext | undefined
}
