import { desc, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { db as defaultDb } from '../../../configs/database.config'
import { LlmUsageEntity, type LlmUsage, type NewLlmUsage } from '../entity/llm-usage.entity'

export class LlmUsageRepository {
  constructor(private database: NodePgDatabase = defaultDb) {}

  async insert(input: NewLlmUsage): Promise<LlmUsage> {
    const result = await this.database.insert(LlmUsageEntity).values(input).returning()
    return result[0]
  }

  async findByAccount(accountId: string): Promise<LlmUsage[]> {
    return this.database
      .select()
      .from(LlmUsageEntity)
      .where(eq(LlmUsageEntity.account_id, accountId))
      .orderBy(desc(LlmUsageEntity.created_date))
  }
}
