import { createOpenAI } from '@ai-sdk/openai'
import { env } from '../../configs/env'
import { LLM_MODELS } from '../../app/llm/constants/data'

export const DEFAULT_MODEL = 'ag/gemini-3.7-flash-high'

/**
 * Some gateways answer with SSE even for non-streaming calls. Force `stream: false`
 * when unset and fold stray SSE bodies back into a ChatCompletion JSON.
 */
const gatewayFetch: typeof fetch = async (url, init) => {
  let isStreamingRequested = false
  if (init?.body && typeof init.body === 'string') {
    try {
      const parsed = JSON.parse(init.body)
      if (parsed && typeof parsed === 'object') {
        if (parsed.stream === true) {
          isStreamingRequested = true
        } else if (parsed.stream === undefined) {
          parsed.stream = false
          init = { ...init, body: JSON.stringify(parsed) }
        }
      }
    } catch {
      // ignore
    }
  }

  const res = await fetch(url, init)
  if (isStreamingRequested) return res

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream')) return res

  const text = await res.text()
  let fullContent = ''
  let finishReason = 'stop'
  let model = DEFAULT_MODEL
  let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) continue
    const dataStr = trimmed.slice(5).trim()
    if (dataStr === '[DONE]') continue
    try {
      const data = JSON.parse(dataStr)
      if (data.model) model = data.model
      const delta = data.choices?.[0]?.delta
      if (delta?.content) fullContent += delta.content
      if (data.choices?.[0]?.finish_reason) finishReason = data.choices[0].finish_reason
      if (data.usage) {
        usage = {
          prompt_tokens: data.usage.prompt_tokens || 0,
          completion_tokens: data.usage.completion_tokens || 0,
          total_tokens: data.usage.total_tokens || 0,
        }
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
        message: { role: 'assistant', content: fullContent },
        finish_reason: finishReason,
      },
    ],
    usage,
  }

  return new Response(JSON.stringify(standardJson), {
    status: res.status,
    statusText: res.statusText,
    headers: { 'content-type': 'application/json' },
  })
}

const provider = createOpenAI({
  apiKey: env.LLM_API_KEY,
  baseURL: env.LLM_BASE_URL,
  fetch: gatewayFetch,
})

export function resolveModelId(modelId?: string): string {
  return modelId && LLM_MODELS.some((m) => m.id === modelId) ? modelId : DEFAULT_MODEL
}

export function resolveModel(modelId?: string) {
  return provider.chat(resolveModelId(modelId))
}
