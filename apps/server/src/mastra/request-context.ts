import { RequestContext } from '@mastra/core/request-context'
import type { AssistantContext } from '../app/assistant/chat/types/chat.types'

export type AssistantRequestContext = {
  accountId?: string
  pageContext?: AssistantContext
}

export function createAssistantRequestContext(values: AssistantRequestContext) {
  const ctx = new RequestContext<AssistantRequestContext>()
  if (values.accountId) ctx.set('accountId', values.accountId)
  if (values.pageContext) ctx.set('pageContext', values.pageContext)
  return ctx
}
