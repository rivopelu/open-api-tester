import { Agent } from '@mastra/core/agent'
import { NotFoundError } from '../../../../configs/exception'
import { DEFAULT_MODEL, llmService } from '../../../llm/service/llm.service'
import { assistantTools } from '../../tools/service/assistant-tools.service'
import { ChatMessageRepository } from '../repository/chat-message.repository'
import { ChatSessionRepository } from '../repository/chat-session.repository'
import type { ChatResult } from '../types/chat.types'

export class ChatService {
  private agent = new Agent({
    id: 'api-studio-assistant',
    name: 'api-studio-assistant',
    instructions:
      'You are the assistant embedded in Max API Studio, a REST API design and testing tool. ' +
      'Help the user inspect and manage their API projects, endpoints, and OpenAPI contracts using the available tools. ' +
      'Be concise and confirm destructive or write actions in your reply.',
    model: llmService.model(),
    tools: assistantTools,
  })

  constructor(
    private sessionRepository: ChatSessionRepository = new ChatSessionRepository(),
    private messageRepository: ChatMessageRepository = new ChatMessageRepository(),
  ) {}

  async chat(accountId: string, message: string, threadId?: string): Promise<ChatResult> {
    const session = threadId
      ? await this.sessionRepository.findById(threadId)
      : await this.sessionRepository.insert({ title: message.slice(0, 80), created_by: accountId })
    if (!session) throw new NotFoundError('Chat session not found')

    const history = await this.messageRepository.findBySession(session.id)
    // Cast to the broad MessageListInput shape Mastra expects: it's a discriminated union keyed
    // on literal `role`, which TS can't verify against role values sourced from DB rows at runtime.
    const conversation = [
      ...history.map((row) => ({ role: row.role, content: row.content })),
      { role: 'user' as const, content: message },
    ] as Parameters<Agent['generate']>[0]
    await this.messageRepository.insert({ session_id: session.id, role: 'user', content: message })

    const result = await this.agent.generate(conversation)
    const usage = await result.usage

    await this.messageRepository.insert({ session_id: session.id, role: 'assistant', content: result.text })
    await llmService.recordUsage({
      accountId,
      threadId: session.id,
      model: DEFAULT_MODEL,
      message,
      promptTokens: usage?.inputTokens,
      completionTokens: usage?.outputTokens,
      totalTokens: usage?.totalTokens,
    })

    return { reply: result.text, threadId: session.id }
  }
}

export const chatService = new ChatService()
