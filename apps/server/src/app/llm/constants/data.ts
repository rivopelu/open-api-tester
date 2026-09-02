export type LlmModelOption = {
  id: string
  label: string
  provider: string
}

export const LLM_MODELS: LlmModelOption[] = [
  { id: 'oc/big-pickle', label: 'Big Pickle', provider: 'OpenCode' },
  { id: 'oc/mimo-v2.5-free', label: 'MiMo v2.5', provider: 'Xiaomi' },
  { id: 'oc/laguna-s-2.1-free', label: 'Laguna S 2.1', provider: 'Poolside' },
  { id: 'cx/gpt-5.6-luna', label: 'GPT-5.6 Luna', provider: 'OpenAI' },
  { id: 'cx/gpt-5.6-terra', label: 'GPT-5.6 Terra', provider: 'OpenAI' },
  { id: 'ag/gemini-3.7-flash-high', label: 'Gemini 3.7 Flash High', provider: 'Google' },
  { id: 'ag/gemini-3.7-flash-low', label: 'Gemini 3.7 Flash Low', provider: 'Google' },
  { id: 'ag/gemini-3.6-flash-high', label: 'Gemini 3.6 Flash High', provider: 'Google' },
]
