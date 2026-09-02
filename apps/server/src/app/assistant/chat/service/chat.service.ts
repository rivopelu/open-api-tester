import { randomUUID } from 'node:crypto'
import { Agent } from '@mastra/core/agent'
import { llmService } from '../../../llm/service/llm.service'
import { assistantTools } from '../../tools/service/assistant-tools.service'
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

  // No Mastra memory store is configured yet, so threadId is only echoed back for the
  // client to group messages by conversation — it isn't used to load prior history.
  async chat(_accountId: string, message: string, threadId?: string): Promise<ChatResult> {
    const resolvedThreadId = threadId ?? randomUUID()
    const result = await this.agent.generate(message)
    return { reply: result.text, threadId: resolvedThreadId }
  }
}

export const chatService = new ChatService()
