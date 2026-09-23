import { Memory } from '@mastra/memory'
import { storage } from './storage'

export const memory = new Memory({
  storage,
  options: {
    lastMessages: 30,
    generateTitle: {
      instructions:
        'Generate a very concise title (maximum 4 to 6 words) summarizing the user prompt. ' +
        'Output only the title text itself without quotation marks or extra punctuation.',
    },
  },
})
