import { Agent } from '@mastra/core/agent'
import type { AssistantContext } from '../../app/assistant/chat/types/chat.types'
import { memory } from '../memory'
import { resolveModel } from '../providers/gateway'
import { assistantTools } from '../tools'
import { buildSystemInstructions } from './instructions'

export const ASSISTANT_AGENT_ID = 'api-studio-assistant'

export const assistantAgent = new Agent({
  id: ASSISTANT_AGENT_ID,
  name: ASSISTANT_AGENT_ID,
  instructions: ({ requestContext }) =>
    buildSystemInstructions(requestContext.get('pageContext') as AssistantContext | undefined),
  model: ({ requestContext }) => resolveModel(requestContext.get('modelId') as string | undefined),
  tools: assistantTools,
  memory,
})
