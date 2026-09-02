import { asc, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { db as defaultDb } from '../../../../configs/database.config'
import { ChatMessageEntity, type ChatMessage, type NewChatMessage } from '../entity/chat-message.entity'

export class ChatMessageRepository {
  constructor(private database: NodePgDatabase = defaultDb) {}

  async insert(input: NewChatMessage): Promise<ChatMessage> {
    const result = await this.database.insert(ChatMessageEntity).values(input).returning()
    return result[0]
  }

  async findBySession(sessionId: string): Promise<ChatMessage[]> {
    return this.database
      .select()
      .from(ChatMessageEntity)
      .where(eq(ChatMessageEntity.session_id, sessionId))
      .orderBy(asc(ChatMessageEntity.created_date))
  }
}
