import type { MastraDBMessage } from '@mastra/core/agent'
import { NotFoundError } from '../../../../configs/exception'
import { getAssistantAgent, memory } from '../../../../mastra'
import { ASSISTANT_MODEL } from '../../../../mastra/providers/gateway'
import { createAssistantRequestContext } from '../../../../mastra/request-context'
import {
  formatToolConfirmation,
  formatToolErrorMessage,
  formatToolSummary,
  UI_EFFECT_CHUNK,
} from '../../../../mastra/tools'
import { llmService } from '../../../llm/service/llm.service'
import type {
  AssistantContext,
  AssistantStreamEvent,
  AssistantUiEffectDto,
  ChatMessageDto,
  ChatResult,
  ChatSessionDto,
} from '../types/chat.types'

const MAX_STEPS = 20
const TITLE_CHUNK = 'data-thread-title'

type StreamEventHandler = (event: AssistantStreamEvent) => Promise<void> | void

type AgentStreamOutput = Awaited<ReturnType<ReturnType<typeof getAssistantAgent>['stream']>>

type RunScope = {
  accountId: string
  threadId: string
  message: string
}

function extractText(message: MastraDBMessage): string {
  const parts = message.content.parts ?? []
  const text = parts
    .filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text')
    .map((p) => p.text)
    .join('')
  return text || (typeof message.content.content === 'string' ? message.content.content : '')
}

export class ChatService {
  private async resolveThread(accountId: string, threadId?: string) {
    if (!threadId) {
      const thread = await memory.createThread({ resourceId: accountId })
      return { thread, isNew: true }
    }
    const thread = await memory.getThreadById({ threadId })
    if (!thread || thread.resourceId !== accountId)
      throw new NotFoundError('Chat session not found')
    return { thread, isNew: false }
  }

  private async recordUsage(
    scope: RunScope,
    usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined,
  ) {
    await llmService.recordUsage({
      accountId: scope.accountId,
      threadId: scope.threadId,
      model: ASSISTANT_MODEL,
      message: scope.message,
      promptTokens: usage?.inputTokens,
      completionTokens: usage?.outputTokens,
      totalTokens: usage?.totalTokens,
    })
  }

  /** Maps Mastra stream chunks onto the existing SSE contract used by the client. */
  private async pipeAgentStream(
    output: AgentStreamOutput,
    scope: RunScope,
    onEvent: StreamEventHandler,
  ): Promise<void> {
    let fullReply = ''
    let suspended = false

    for await (const chunk of output.fullStream) {
      switch (chunk.type) {
        case 'text-delta':
          if (chunk.payload.text) {
            fullReply += chunk.payload.text
            await onEvent({ type: 'token', delta: chunk.payload.text })
          }
          break
        case 'tool-call':
          await onEvent({
            type: 'tool_call_start',
            toolId: chunk.payload.toolCallId,
            toolName: chunk.payload.toolName,
            args: chunk.payload.args as Record<string, unknown> | undefined,
          })
          break
        case 'tool-call-approval':
          suspended = true
          await onEvent({
            type: 'tool_confirmation_request',
            confirmationId: chunk.payload.toolCallId,
            runId: chunk.runId,
            threadId: scope.threadId,
            toolId: chunk.payload.toolCallId,
            toolName: chunk.payload.toolName,
            args: chunk.payload.args,
            summary: formatToolConfirmation(chunk.payload.toolName, chunk.payload.args),
          })
          break
        case 'tool-result':
          if (chunk.payload.isError) {
            await onEvent({
              type: 'tool_call_error',
              toolId: chunk.payload.toolCallId,
              toolName: chunk.payload.toolName,
              resultSummary: formatToolErrorMessage(chunk.payload.result),
            })
          } else {
            await onEvent({
              type: 'tool_call_complete',
              toolId: chunk.payload.toolCallId,
              toolName: chunk.payload.toolName,
              resultSummary: formatToolSummary(
                chunk.payload.toolName,
                chunk.payload.result,
                chunk.payload.args,
              ),
            })
          }
          break
        case 'tool-error':
          await onEvent({
            type: 'tool_call_error',
            toolId: chunk.payload.toolCallId,
            toolName: chunk.payload.toolName,
            resultSummary: formatToolErrorMessage(chunk.payload.error),
          })
          break
        case 'tool-output-denied':
          await onEvent({
            type: 'tool_call_error',
            toolId: chunk.payload.toolCallId,
            toolName: chunk.payload.toolName,
            resultSummary: 'Dibatalkan oleh pengguna',
          })
          break
        case 'error': {
          const err = chunk.payload.error
          await onEvent({
            type: 'error',
            message:
              err instanceof Error ? err.message : String(err ?? 'Failed to generate response'),
          })
          break
        }
        default:
          if (chunk.type === UI_EFFECT_CHUNK) {
            await onEvent({ type: 'ui_effect', effect: chunk.data as AssistantUiEffectDto })
          } else if (chunk.type === TITLE_CHUNK) {
            const data = chunk.data as { threadId: string; title: string }
            await onEvent({
              type: 'session_info',
              threadId: data.threadId,
              sessionTitle: data.title,
            })
          }
      }
    }

    await this.recordUsage(scope, await output.totalUsage)

    // A suspended run resumes through the confirm endpoint, which emits its own `done`.
    if (!suspended) {
      await onEvent({ type: 'done', fullReply, threadId: scope.threadId })
    }
  }

  async chat(
    accountId: string,
    message: string,
    threadId?: string,
    context?: AssistantContext,
  ): Promise<ChatResult> {
    const { thread } = await this.resolveThread(accountId, threadId)

    const result = await getAssistantAgent().generate(message, {
      maxSteps: MAX_STEPS,
      memory: { thread: thread.id, resource: accountId },
      requestContext: createAssistantRequestContext({
        accountId,
        pageContext: context,
      }),
    })

    await this.recordUsage({ accountId, threadId: thread.id, message }, result.totalUsage)

    const updated = await memory.getThreadById({ threadId: thread.id })
    return { reply: result.text, threadId: thread.id, sessionTitle: updated?.title }
  }

  async chatStream(
    accountId: string,
    message: string,
    threadId: string | undefined,
    onEvent: StreamEventHandler,
    context?: AssistantContext,
  ): Promise<void> {
    const { thread, isNew } = await this.resolveThread(accountId, threadId)

    if (isNew) {
      await onEvent({
        type: 'session_info',
        threadId: thread.id,
        sessionTitle: message.slice(0, 38),
      })
    }

    const output = await getAssistantAgent().stream(message, {
      maxSteps: MAX_STEPS,
      memory: {
        thread: thread.id,
        resource: accountId,
        options: { generateTitle: isNew ? { emitEvent: true } : false },
      },
      requestContext: createAssistantRequestContext({
        accountId,
        pageContext: context,
      }),
    })

    await this.pipeAgentStream(output, { accountId, threadId: thread.id, message }, onEvent)
  }

  /** Resumes a run suspended on a `requireApproval` tool and streams the continuation. */
  async resolveConfirmationStream(
    accountId: string,
    input: {
      runId: string
      threadId: string
      toolCallId: string
      approved: boolean
      context?: AssistantContext
    },
    onEvent: StreamEventHandler,
  ): Promise<void> {
    const { thread } = await this.resolveThread(accountId, input.threadId)
    const agent = getAssistantAgent()
    const options = {
      runId: input.runId,
      toolCallId: input.toolCallId,
      maxSteps: MAX_STEPS,
      memory: { thread: thread.id, resource: accountId },
      requestContext: createAssistantRequestContext({
        accountId,
        pageContext: input.context,
      }),
    }

    const output = input.approved
      ? await agent.approveToolCall(options)
      : await agent.declineToolCall({ ...options, reason: 'Dibatalkan oleh pengguna' })

    await this.pipeAgentStream(
      output,
      {
        accountId,
        threadId: thread.id,
        message: `[confirmation] ${input.toolCallId}`,
      },
      onEvent,
    )
  }

  async getSessions(accountId: string): Promise<ChatSessionDto[]> {
    const { threads } = await memory.listThreads({
      perPage: false,
      filter: { resourceId: accountId },
      orderBy: { field: 'updatedAt', direction: 'DESC' },
    })
    return threads.map((t) => ({
      id: t.id,
      title: t.title ?? null,
      created_by: t.resourceId,
      created_date: new Date(t.createdAt).getTime(),
      updated_date: new Date(t.updatedAt).getTime(),
    }))
  }

  async getSessionMessages(accountId: string, sessionId: string): Promise<ChatMessageDto[]> {
    await this.resolveThread(accountId, sessionId)
    const { messages } = await memory.recall({ threadId: sessionId, perPage: false })
    return messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        id: m.id,
        session_id: sessionId,
        role: m.role as 'user' | 'assistant',
        content: extractText(m),
        created_date: new Date(m.createdAt).getTime(),
      }))
      .filter((m) => m.content.length > 0)
  }

  async deleteSession(accountId: string, sessionId: string): Promise<boolean> {
    await this.resolveThread(accountId, sessionId)
    await memory.deleteThread(sessionId)
    return true
  }
}

export const chatService = new ChatService()
