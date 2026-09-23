import { Mastra } from '@mastra/core/mastra'
import { PinoLogger } from '@mastra/loggers'
import { env } from '../configs/env'
import { ASSISTANT_AGENT_ID, assistantAgent } from './agents/assistant.agent'
import { storage } from './storage'

export const mastra = new Mastra({
  agents: { [ASSISTANT_AGENT_ID]: assistantAgent },
  storage,
  logger: new PinoLogger({ name: 'mastra', level: env.APP_ENV === 'production' ? 'info' : 'warn' }),
})

export function getAssistantAgent() {
  return mastra.getAgent(ASSISTANT_AGENT_ID)
}

export { memory } from './memory'
