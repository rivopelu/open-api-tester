import { createOpenAI } from '@ai-sdk/openai'
import { env } from '../../../configs/env'
import { LlmUsageRepository } from '../repository/llm-usage.repository'

export const DEFAULT_MODEL = 'gpt-4o-mini'

export type RecordLlmUsageInput = {
  accountId?: string
  threadId?: string
  model: string
  message: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

export class LlmService {
  private provider = createOpenAI({
    apiKey: env.LLM_API_KEY,
    baseURL: env.LLM_BASE_URL,
  })

  constructor(private usageRepository: LlmUsageRepository = new LlmUsageRepository()) {}

  model(modelId: string = DEFAULT_MODEL) {
    return this.provider(modelId)
  }

  async recordUsage(input: RecordLlmUsageInput) {
    return this.usageRepository.insert({
      account_id: input.accountId,
      thread_id: input.threadId,
      model: input.model,
      message: input.message,
      prompt_tokens: input.promptTokens ?? 0,
      completion_tokens: input.completionTokens ?? 0,
      total_tokens: input.totalTokens ?? 0,
    })
  }
}

export const llmService = new LlmService()
