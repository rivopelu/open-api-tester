import { desc, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { db as defaultDb } from '../../../../configs/database.config'
import { ChatSessionEntity, type ChatSession, type NewChatSession } from '../entity/chat-session.entity'

export class ChatSessionRepository {
  constructor(private database: NodePgDatabase = defaultDb) {}

  async insert(input: NewChatSession): Promise<ChatSession> {
    const result = await this.database.insert(ChatSessionEntity).values(input).returning()
    return result[0]
  }

  async update(id: string, input: Partial<NewChatSession>): Promise<ChatSession | null> {
    const result = await this.database
      .update(ChatSessionEntity)
      .set(input)
      .where(eq(ChatSessionEntity.id, id))
      .returning()
    return result[0] ?? null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.database
      .delete(ChatSessionEntity)
      .where(eq(ChatSessionEntity.id, id))
      .returning()
    return result.length > 0
  }

  async findById(id: string): Promise<ChatSession | null> {
    const result = await this.database
      .select()
      .from(ChatSessionEntity)
      .where(eq(ChatSessionEntity.id, id))
      .limit(1)
    return result[0] ?? null
  }

  async findByAccount(accountId: string): Promise<ChatSession[]> {
    return this.database
      .select()
      .from(ChatSessionEntity)
      .where(eq(ChatSessionEntity.created_by, accountId))
      .orderBy(desc(ChatSessionEntity.created_date))
  }
}
