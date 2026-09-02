import { Context } from 'hono'
import { streamSSE } from 'hono/streaming'
import { Controller, Get, Post, Delete, AuthAccess } from '../../lib/decorators'
import { ResponseHelper } from '../../lib/response-helper'
import { UnauthorizedError } from '../../configs/exception'
import { getUser } from '../../lib/get-user'
import { ChatService } from '../../app/assistant/chat/service/chat.service'
import { ChatRequestSchema } from '../../app/assistant/chat/types/chat.types'
import { LLM_MODELS } from '../../app/llm/constants/data'

@Controller()
export class AssistantController {
  private chatService = new ChatService()

  @Get('/assistant/models')
  @AuthAccess()
  async getModels(c: Context) {
    return c.json(ResponseHelper.data(LLM_MODELS))
  }

  @Get('/assistant/sessions')
  @AuthAccess()
  async getSessions(c: Context) {
    const user = getUser(c)
    if (!user) throw new UnauthorizedError()
    const sessions = await this.chatService.getSessions(user.sub)
    return c.json(ResponseHelper.data(sessions))
  }

  @Get('/assistant/sessions/:id/messages')
  @AuthAccess()
  async getSessionMessages(c: Context) {
    const user = getUser(c)
    if (!user) throw new UnauthorizedError()
    const sessionId = c.req.param('id')
    if (!sessionId) {
      return c.json(ResponseHelper.data([]))
    }
    const messages = await this.chatService.getSessionMessages(sessionId)
    return c.json(ResponseHelper.data(messages))
  }

  @Delete('/assistant/sessions/:id')
  @AuthAccess()
  async deleteSession(c: Context) {
    const user = getUser(c)
    if (!user) throw new UnauthorizedError()
    const sessionId = c.req.param('id')
    if (!sessionId) {
      return c.json(ResponseHelper.data({ deleted: false }))
    }
    const deleted = await this.chatService.deleteSession(sessionId)
    return c.json(ResponseHelper.data({ deleted }))
  }

  @Post('/assistant/chat')
  @AuthAccess()
  async chat(c: Context) {
    const user = getUser(c)
    if (!user) throw new UnauthorizedError()
    const { message, threadId, model, context } = ChatRequestSchema.parse(await c.req.json())
    const result = await this.chatService.chat(user.sub, message, threadId, model, context)
    return c.json(ResponseHelper.data(result))
  }

  @Post('/assistant/chat/stream')
  @AuthAccess()
  async chatStream(c: Context) {
    const user = getUser(c)
    if (!user) throw new UnauthorizedError()
    const { message, threadId, model, context } = ChatRequestSchema.parse(await c.req.json())

    return streamSSE(c, async (stream) => {
      try {
        await this.chatService.chatStream(
          user.sub,
          message,
          threadId,
          model,
          async (event) => {
            await stream.writeSSE({
              event: event.type,
              data: JSON.stringify(event),
            })
          },
          context,
        )
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Chat stream execution failed'
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({ type: 'error', message: errorMsg }),
        })
      }
    })
  }
}

export const assistantController = new AssistantController()
