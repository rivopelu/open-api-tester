import { Context } from 'hono'
import { Controller, Post, AuthAccess } from '../../lib/decorators'
import { ResponseHelper } from '../../lib/response-helper'
import { UnauthorizedError } from '../../configs/exception'
import { getUser } from '../../lib/get-user'
import { ChatService } from '../../app/assistant/chat/service/chat.service'
import { ChatRequestSchema } from '../../app/assistant/chat/types/chat.types'

@Controller()
export class AssistantController {
  private chatService = new ChatService()

  @Post('/assistant/chat')
  @AuthAccess()
  async chat(c: Context) {
    const user = getUser(c)
    if (!user) throw new UnauthorizedError()
    const { message, threadId } = ChatRequestSchema.parse(await c.req.json())
    const result = await this.chatService.chat(user.sub, message, threadId)
    return c.json(ResponseHelper.data(result))
  }
}

export const assistantController = new AssistantController()
