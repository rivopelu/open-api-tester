/**
 * One-time copy of legacy chat_sessions / chat_messages into Mastra Memory.
 * Run: node --env-file=../../.env --import tsx scripts/migrate-chat-to-mastra.ts
 * Idempotent: threads that already exist in Mastra are skipped.
 */
import { asc, eq } from 'drizzle-orm'
import { db, pool } from '../src/configs/database.config'
import { ChatMessageEntity } from '../src/app/assistant/chat/entity/chat-message.entity'
import { ChatSessionEntity } from '../src/app/assistant/chat/entity/chat-session.entity'
import { memory } from '../src/mastra/memory'
import { storage } from '../src/mastra/storage'

async function main() {
  await storage.init()
  const sessions = await db.select().from(ChatSessionEntity)
  let migrated = 0

  for (const session of sessions) {
    if (!session.created_by) continue
    if (await memory.getThreadById({ threadId: session.id })) continue

    await memory.saveThread({
      thread: {
        id: session.id,
        resourceId: session.created_by,
        title: session.title ?? undefined,
        createdAt: new Date(session.created_date),
        updatedAt: new Date(session.updated_date ?? session.created_date),
        metadata: { migratedFrom: 'chat_sessions' },
      },
    })

    const rows = await db
      .select()
      .from(ChatMessageEntity)
      .where(eq(ChatMessageEntity.session_id, session.id))
      .orderBy(asc(ChatMessageEntity.created_date))

    const messages = rows
      .filter((row) => row.role === 'user' || row.role === 'assistant')
      .map((row) => ({
        id: row.id,
        threadId: session.id,
        resourceId: session.created_by!,
        role: row.role as 'user' | 'assistant',
        createdAt: new Date(row.created_date),
        content: { format: 2 as const, parts: [{ type: 'text' as const, text: row.content }] },
      }))

    if (messages.length) await memory.saveMessages({ messages })
    migrated++
  }

  console.log(`Migrated ${migrated}/${sessions.length} chat sessions into Mastra memory.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
