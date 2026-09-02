import { createOpenAI } from '@ai-sdk/openai'
import { env } from '../../../configs/env'

const DEFAULT_MODEL = 'gpt-4o-mini'

export class LlmService {
  private provider = createOpenAI({
    apiKey: env.LLM_API_KEY,
    baseURL: env.LLM_BASE_URL,
  })

  model(modelId: string = DEFAULT_MODEL) {
    return this.provider(modelId)
  }
}

export const llmService = new LlmService()
