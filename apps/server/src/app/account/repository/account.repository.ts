import { eq, ilike, asc, desc, count, sql, and } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { db as defaultDb } from '../../../configs/database.config'
import { AccountEntity, type Account, type NewAccount } from '../entity/account.entity'
import type { AccountListQuery, AccountListResult } from '../types/account.types'

export class AccountRepository {
  constructor(private database: NodePgDatabase = defaultDb) {}

  async findByEmail(email: string): Promise<Account | null> {
    const result = await this.database
      .select()
      .from(AccountEntity)
      .where(eq(AccountEntity.email, email))
      .limit(1)
    return result[0] ?? null
  }

  async findById(id: string): Promise<Account | null> {
    const result = await this.database
      .select()
      .from(AccountEntity)
      .where(eq(AccountEntity.id, id))
      .limit(1)
    return result[0] ?? null
  }

  async findAll(query: AccountListQuery): Promise<AccountListResult> {
    const page = Math.max(0, query.page ?? 0)
    const size = Math.min(100, Math.max(1, query.size ?? 20))
    const search = query.q?.trim()
    const sortField = query.sort === 'name' ? AccountEntity.name : AccountEntity.created_date
    const sortOrder = query.order === 'asc' ? asc(sortField) : desc(sortField)

    const conditions: ReturnType<typeof sql>[] = [eq(AccountEntity.active, true)]
    if (search) {
      const pattern = `%${search}%`
      conditions.push(
        sql`(${ilike(AccountEntity.name, pattern)} or ${ilike(AccountEntity.email, pattern)})`,
      )
    }

    const where = and(...conditions)

    const [totalResult] = await this.database
      .select({ total: count() })
      .from(AccountEntity)
      .where(where)

    const items = await this.database
      .select({
        id: AccountEntity.id,
        email: AccountEntity.email,
        name: AccountEntity.name,
        profile_picture: AccountEntity.profile_picture,
        active: AccountEntity.active,
        created_date: AccountEntity.created_date,
      })
      .from(AccountEntity)
      .where(where)
      .orderBy(sortOrder)
      .limit(size)
      .offset(page * size)

    return {
      items,
      total: totalResult?.total ?? 0,
    }
  }

  async insert(input: NewAccount): Promise<Account> {
    const result = await this.database.insert(AccountEntity).values(input).returning()
    return result[0]
  }

  async update(id: string, input: Partial<NewAccount>): Promise<Account> {
    const result = await this.database
      .update(AccountEntity)
      .set({ ...input, updated_date: Date.now() })
      .where(eq(AccountEntity.id, id))
      .returning()
    return result[0]
  }
}
