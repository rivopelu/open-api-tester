import { createOpenAI } from '@ai-sdk/openai'
import { env } from '../../../configs/env'
import { LlmUsageRepository } from '../repository/llm-usage.repository'

export const DEFAULT_MODEL = 'ag/gemini-3.7-flash-high'

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
    fetch: async (url, init) => {
      let isStreamingRequested = false
      // If the body requested non-streaming (stream: false or undefined)
      // ensure the payload explicitly sets stream: false so gateways do not force SSE
      if (init?.body && typeof init.body === 'string') {
        try {
          const parsed = JSON.parse(init.body)
          if (parsed && typeof parsed === 'object') {
            if (parsed.stream === true) {
              isStreamingRequested = true
            } else if (parsed.stream === undefined) {
              parsed.stream = false
              init = {
                ...init,
                body: JSON.stringify(parsed),
              }
            }
          }
        } catch {
          // ignore
        }
      }

      const res = await fetch(url, init)
      const contentType = res.headers.get('content-type') || ''

      // If streaming was requested and gateway returned SSE stream, pass the response directly
      if (isStreamingRequested) {
        return res
      }

      // If the gateway returned SSE text/event-stream even for a non-stream generate call,
      // collect the chunks into a standard OpenAI ChatCompletion JSON response.
      if (contentType.includes('text/event-stream')) {
        const text = await res.text()
        const lines = text.split('\n')
        let fullContent = ''
        let finishReason = 'stop'
        let model = DEFAULT_MODEL
        let promptTokens = 0
        let completionTokens = 0
        let totalTokens = 0

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data:')) continue
          const dataStr = trimmed.slice(5).trim()
          if (dataStr === '[DONE]') continue

          try {
            const data = JSON.parse(dataStr)
            if (data.model) model = data.model
            const delta = data.choices?.[0]?.delta
            if (delta?.content) {
              fullContent += delta.content
            }
            if (data.choices?.[0]?.finish_reason) {
              finishReason = data.choices[0].finish_reason
            }
            if (data.usage) {
              promptTokens = data.usage.prompt_tokens || 0
              completionTokens = data.usage.completion_tokens || 0
              totalTokens = data.usage.total_tokens || 0
            }
          } catch {
            // ignore non-json line
          }
        }

        const standardJson = {
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: fullContent,
              },
              finish_reason: finishReason,
            },
          ],
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens,
          },
        }

        return new Response(JSON.stringify(standardJson), {
          status: res.status,
          statusText: res.statusText,
          headers: {
            'content-type': 'application/json',
          },
        })
      }

      return res
    },
  })

  constructor(private usageRepository: LlmUsageRepository = new LlmUsageRepository()) {}

  model(modelId: string = DEFAULT_MODEL) {
    return this.provider.chat(modelId)
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
