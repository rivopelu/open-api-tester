import { create } from 'zustand';
import type { AssistantUiEffectDto } from '../lib/api';

interface HighlightState {
  endpointId?: string;
  target?: 'url' | 'summary' | 'method' | 'params' | 'headers' | 'body' | 'responses' | 'examples' | 'docs';
  timestamp: number;
}

interface DocsTypingState {
  endpointId: string;
  timestamp: number;
}

interface AssistantEffectStore {
  activeHighlight: HighlightState | null;
  triggerHighlight: (endpointId?: string, target?: HighlightState['target']) => void;
  clearHighlight: () => void;
  pendingEffect: AssistantUiEffectDto | null;
  dispatchEffect: (effect: AssistantUiEffectDto) => void;
  consumePendingEffect: () => AssistantUiEffectDto | null;
  docsTyping: DocsTypingState | null;
  consumeDocsTyping: () => DocsTypingState | null;
}

let timeoutId: number | null = null;

export const useAssistantEffectStore = create<AssistantEffectStore>()((set, get) => ({
  activeHighlight: null,
  pendingEffect: null,
  docsTyping: null,

  triggerHighlight: (endpointId, target) => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
    set({
      activeHighlight: {
        endpointId,
        target,
        timestamp: Date.now(),
      },
    });

    timeoutId = window.setTimeout(() => {
      set({ activeHighlight: null });
      timeoutId = null;
    }, 4000);
  },

  clearHighlight: () => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
    set({ activeHighlight: null });
  },

  dispatchEffect: (effect) => {
    set({ pendingEffect: effect });
    if (effect.target) {
      get().triggerHighlight(effect.endpointId, effect.target);
    }
    if (effect.target === 'docs' && effect.endpointId) {
      set({ docsTyping: { endpointId: effect.endpointId, timestamp: Date.now() } });
    }
  },

  consumePendingEffect: () => {
    const effect = get().pendingEffect;
    if (effect) {
      set({ pendingEffect: null });
    }
    return effect;
  },

  consumeDocsTyping: () => {
    const state = get().docsTyping;
    if (state) {
      set({ docsTyping: null });
    }
    return state;
  },
}));
