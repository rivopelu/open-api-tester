import { Agent } from '@mastra/core/agent'
import { NotFoundError } from '../../../../configs/exception'
import { DEFAULT_MODEL, llmService } from '../../../llm/service/llm.service'
import { createAssistantTools, type AssistantToolEventListener } from '../../tools/service/assistant-tools.service'
import { ChatMessageRepository } from '../repository/chat-message.repository'
import { ChatSessionRepository } from '../repository/chat-session.repository'
import type { AssistantContext, AssistantStreamEvent, ChatResult } from '../types/chat.types'

export class ChatService {
  constructor(
    private sessionRepository: ChatSessionRepository = new ChatSessionRepository(),
    private messageRepository: ChatMessageRepository = new ChatMessageRepository(),
  ) {}

  private buildSystemInstructions(context?: AssistantContext): string {
    let instructions =
      'You are the assistant embedded in Max API Studio, a modern REST API design and testing tool. ' +
      'Help the user inspect, analyze, design, and troubleshoot their REST APIs, OpenAPI projects, folders, endpoints, examples, and mock server responses. ' +
      'Always make use of the provided tools (list_projects, get_project, create_project, list_folders, create_folder, update_folder, delete_folder, get_endpoints_by_project, get_endpoint_detail, create_endpoint, update_endpoint_contract, move_endpoint, create_example, list_mock_examples, simulate_mock_response) ' +
      'whenever the user asks about their projects, specs, mock data, or endpoints, or when modifying/creating items. ' +
      'Provide clear, well-structured markdown responses.\n\n'

    if (context && (context.projectId || context.endpointId || context.pathname)) {
      instructions += '### CURRENT USER VIEWPORT & PAGE CONTEXT:\n'
      if (context.pathname) instructions += `- Current URL Path: ${context.pathname}\n`
      if (context.projectId) instructions += `- Active Project ID: ${context.projectId}\n`
      if (context.endpointId) instructions += `- Active / Selected Endpoint ID: ${context.endpointId}\n`
      if (context.tab) instructions += `- Active UI Tab: ${context.tab}\n`
      if (context.exampleId) instructions += `- Active / Selected Example ID: ${context.exampleId}\n`
      instructions +=
        '\nWhen the user refers to "this endpoint", "this project", "the current example", or asks what is missing/wrong with the active endpoint or project, prioritize the Active IDs above and use get_endpoint_detail / get_project to inspect them automatically. ' +
        'However, if the user explicitly mentions another project or asks to create/edit another endpoint/project, execute their request for that target regardless of the current page.'
    }

    return instructions
  }

  private createAgent(
    modelId?: string,
    onToolEvent?: AssistantToolEventListener,
    accountId?: string,
    context?: AssistantContext,
  ) {
    return new Agent({
      id: 'api-studio-assistant',
      name: 'api-studio-assistant',
      instructions: this.buildSystemInstructions(context),
      model: llmService.model(modelId || DEFAULT_MODEL),
      tools: createAssistantTools(onToolEvent, accountId),
    })
  }

  private async generateSessionTitle(prompt: string, modelId?: string): Promise<string> {
    try {
      const titleAgent = new Agent({
        id: 'title-generator',
        name: 'title-generator',
        instructions:
          'Generate a very concise title (maximum 4 to 6 words) summarizing the user prompt. ' +
          'Output only the title text itself without quotation marks or extra punctuation.',
        model: llmService.model(modelId || DEFAULT_MODEL),
      })
      const result = await titleAgent.generate(`User prompt: "${prompt}"\nTitle:`)
      const cleaned = result.text.replace(/^["'\s]+|["'\s]+$/g, '').trim()
      return cleaned.length > 50 ? cleaned.slice(0, 50) : cleaned || prompt.slice(0, 38)
    } catch {
      return prompt.length > 38 ? `${prompt.slice(0, 38)}…` : prompt
    }
  }

  async chat(
    accountId: string,
    message: string,
    threadId?: string,
    modelId?: string,
    context?: AssistantContext,
  ): Promise<ChatResult> {
    const activeModel = modelId || DEFAULT_MODEL
    let isNewSession = false

    const session = threadId
      ? await this.sessionRepository.findById(threadId)
      : await (async () => {
          isNewSession = true
          return this.sessionRepository.insert({
            title: message.slice(0, 38),
            created_by: accountId,
          })
        })()

    if (!session) throw new NotFoundError('Chat session not found')

    const history = await this.messageRepository.findBySession(session.id)
    const conversation = [
      ...history.map((row) => ({ role: row.role, content: row.content })),
      { role: 'user' as const, content: message },
    ] as Parameters<Agent['generate']>[0]

    await this.messageRepository.insert({ session_id: session.id, role: 'user', content: message })

    const agent = this.createAgent(activeModel, undefined, accountId, context)
    const result = await agent.generate(conversation)
    const usage = await result.usage

    await this.messageRepository.insert({ session_id: session.id, role: 'assistant', content: result.text })

    await llmService.recordUsage({
      accountId,
      threadId: session.id,
      model: activeModel,
      message,
      promptTokens: usage?.inputTokens,
      completionTokens: usage?.outputTokens,
      totalTokens: usage?.totalTokens,
    })

    // If new session, asynchronously or inline generate a concise descriptive title
    let sessionTitle = session.title || message.slice(0, 38)
    if (isNewSession) {
      const generatedTitle = await this.generateSessionTitle(message, activeModel)
      if (generatedTitle) {
        await this.sessionRepository.update(session.id, { title: generatedTitle })
        sessionTitle = generatedTitle
      }
    }

    return {
      reply: result.text,
      threadId: session.id,
      sessionTitle,
    }
  }

  async chatStream(
    accountId: string,
    message: string,
    threadId: string | undefined,
    modelId: string | undefined,
    onEvent: (event: AssistantStreamEvent) => Promise<void> | void,
    context?: AssistantContext,
  ): Promise<void> {
    const activeModel = modelId || DEFAULT_MODEL
    let isNewSession = false

    const session = threadId
      ? await this.sessionRepository.findById(threadId)
      : await (async () => {
          isNewSession = true
          return this.sessionRepository.insert({
            title: message.slice(0, 38),
            created_by: accountId,
          })
        })()

    if (!session) throw new NotFoundError('Chat session not found')

    await this.messageRepository.insert({ session_id: session.id, role: 'user', content: message })

    const history = await this.messageRepository.findBySession(session.id)
    // Exclude the message we just inserted from history to build conversation
    const prevHistory = history.filter((h) => h.content !== message || h.role !== 'user' || h.id !== history[history.length - 1].id)
    const conversation = [
      ...prevHistory.map((row) => ({ role: row.role, content: row.content })),
      { role: 'user' as const, content: message },
    ] as Parameters<Agent['generate']>[0]

    let sessionTitle = session.title || message.slice(0, 38)
    if (isNewSession) {
      // Send initial session info
      await onEvent({ type: 'session_info', threadId: session.id, sessionTitle })
    }

    const agent = this.createAgent(
      activeModel,
      async (toolEvt) => {
        if (toolEvt.type === 'tool_call_start') {
          await onEvent({
            type: 'tool_call_start',
            toolId: toolEvt.toolId,
            toolName: toolEvt.toolName,
            args: toolEvt.args,
          })
        } else if (toolEvt.type === 'tool_call_complete') {
          await onEvent({
            type: 'tool_call_complete',
            toolId: toolEvt.toolId,
            toolName: toolEvt.toolName,
            resultSummary: toolEvt.resultSummary,
          })
        } else if (toolEvt.type === 'tool_call_error') {
          await onEvent({
            type: 'tool_call_error',
            toolId: toolEvt.toolId,
            toolName: toolEvt.toolName,
            resultSummary: toolEvt.resultSummary,
          })
        }
      },
      accountId,
      context,
    )

    let fullReply = ''
    let promptTokens: number | undefined
    let completionTokens: number | undefined
    let totalTokens: number | undefined

    try {
      const streamResult = await agent.stream(conversation)

      for await (const chunk of streamResult.textStream) {
        if (chunk) {
          fullReply += chunk
          await onEvent({ type: 'token', delta: chunk })
        }
      }

      const usage = await streamResult.usage
      promptTokens = usage?.inputTokens
      completionTokens = usage?.outputTokens
      totalTokens = usage?.totalTokens
    } catch {
      // If .stream is not supported by the model adapter or encounters an error, fallback to generate
      try {
        const genResult = await agent.generate(conversation)
        fullReply = genResult.text
        await onEvent({ type: 'token', delta: fullReply })
        const usage = await genResult.usage
        promptTokens = usage?.inputTokens
        completionTokens = usage?.outputTokens
        totalTokens = usage?.totalTokens
      } catch (genErr: unknown) {
        const errorMsg = genErr instanceof Error ? genErr.message : 'Failed to generate response'
        await onEvent({ type: 'error', message: errorMsg })
        throw genErr
      }
    }

    await this.messageRepository.insert({ session_id: session.id, role: 'assistant', content: fullReply })

    await llmService.recordUsage({
      accountId,
      threadId: session.id,
      model: activeModel,
      message,
      promptTokens,
      completionTokens,
      totalTokens,
    })

    if (isNewSession) {
      const generatedTitle = await this.generateSessionTitle(message, activeModel)
      if (generatedTitle) {
        await this.sessionRepository.update(session.id, { title: generatedTitle })
        sessionTitle = generatedTitle
        await onEvent({ type: 'session_info', threadId: session.id, sessionTitle })
      }
    }

    await onEvent({ type: 'done', fullReply, threadId: session.id })
  }

  async getSessions(accountId: string) {
    return this.sessionRepository.findByAccount(accountId)
  }

  async getSessionMessages(sessionId: string) {
    return this.messageRepository.findBySession(sessionId)
  }

  async deleteSession(sessionId: string) {
    return this.sessionRepository.delete(sessionId)
  }
}

export const chatService = new ChatService()
