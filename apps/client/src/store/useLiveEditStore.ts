import { create } from 'zustand';
import type {
  EndpointAuthConfig,
  HttpMethod,
  LiveEditOp,
  LiveEditPlan,
  LiveEditRowSection,
  ResponseDefinition,
} from '@modern-api-studio/types';

/** Tabs of the endpoint request panel the runner can switch to. */
export type LiveEditTab = 'params' | 'authorization' | 'headers' | 'body' | 'docs' | 'examples';

/** Highlight targets already understood by EndpointDetailView's `isHighlighted`. */
export type LiveEditField =
  | 'method'
  | 'url'
  | 'summary'
  | 'params'
  | 'headers'
  | 'body'
  | 'docs'
  | 'responses'
  | 'examples';

export type LiveEditTextField = 'url' | 'summary' | 'body' | 'docs';

/** Registered by EndpointDetailView: thin wrappers over its own form state setters. */
export interface EndpointFormAdapter {
  endpointId: string;
  focusTab: (tab: LiveEditTab) => void;
  getText: (field: LiveEditTextField) => string;
  setText: (field: LiveEditTextField, value: string) => void;
  setMethod: (method: HttpMethod) => void;
  setRows: (section: LiveEditRowSection, rows: { key: string; value: string }[]) => void;
  setAuth: (auth: Partial<EndpointAuthConfig>) => void;
  /**
   * Re-read the form from the endpoint: `saved` waits for the saved version to arrive,
   * otherwise (save failed) resets to the current endpoint right away.
   */
  resyncAfterSave: (saved: boolean) => void;
}

/** Registered by EndpointContractExamples (only mounted on the Examples tab). */
export interface ExamplesAdapter {
  endpointId: string;
  setResponses: (responses: ResponseDefinition[]) => void;
  openExample: (op: Extract<LiveEditOp, { kind: 'example' }>) => void;
  setExampleValue: (exampleId: string, value: string) => void;
}

export interface LiveEditSession {
  plan: LiveEditPlan;
  runId: string;
  toolCallId: string;
  threadId: string;
  assistantMsgId: string;
  opIndex: number;
  activeField: LiveEditField | null;
  phase: 'opening' | 'typing' | 'saving';
}

interface LiveEditStore {
  session: LiveEditSession | null;
  formAdapter: EndpointFormAdapter | null;
  examplesAdapter: ExamplesAdapter | null;
  start: (session: Omit<LiveEditSession, 'opIndex' | 'activeField' | 'phase'>) => void;
  update: (changes: Partial<Pick<LiveEditSession, 'opIndex' | 'activeField' | 'phase'>>) => void;
  end: () => void;
  registerForm: (adapter: EndpointFormAdapter) => () => void;
  registerExamples: (adapter: ExamplesAdapter) => () => void;
}

export const useLiveEditStore = create<LiveEditStore>()((set, get) => ({
  session: null,
  formAdapter: null,
  examplesAdapter: null,

  start: (session) => set({ session: { ...session, opIndex: 0, activeField: null, phase: 'opening' } }),
  update: (changes) => {
    const session = get().session;
    if (session) set({ session: { ...session, ...changes } });
  },
  end: () => set({ session: null }),

  registerForm: (adapter) => {
    set({ formAdapter: adapter });
    return () => {
      if (get().formAdapter === adapter) set({ formAdapter: null });
    };
  },
  registerExamples: (adapter) => {
    set({ examplesAdapter: adapter });
    return () => {
      if (get().examplesAdapter === adapter) set({ examplesAdapter: null });
    };
  },
}));

/** True while the assistant is typing into this endpoint; the form must be read-only. */
export function useLiveEditLocked(endpointId: string): boolean {
  return useLiveEditStore((state) => state.session?.plan.endpointId === endpointId);
}
