import { LlmUsageRepository } from '../repository/llm-usage.repository'

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
  constructor(private usageRepository: LlmUsageRepository = new LlmUsageRepository()) {}

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
