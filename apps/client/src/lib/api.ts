import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'api-studio:token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  response_data?: T;
}

export async function unwrap<T>(request: Promise<unknown>): Promise<T> {
  const response = await request;
  const body = response as { data: ApiEnvelope<T> };
  const envelope = body.data;

  if (!envelope.success) {
    throw new Error(envelope.message ?? 'Request failed');
  }

  return envelope.response_data as T;
}

export interface AuthAccount {
  id: string;
  email: string;
  name: string;
  profile_picture: string | null;
}

export interface AuthResult {
  access_token: string;
  account: AuthAccount;
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  version: string | null;
  createdAt: string;
  updatedAt: string | null;
  createdById?: string | null;
  creator?: {
    name: string;
    email: string;
    profilePicture: string | null;
  } | null;
}

export interface ProjectDetailDto {
  project: ProjectDto;
  endpoints: EndpointDto[];
  folders: EndpointFolderDto[];
}

export interface EndpointFolderDto {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface EndpointDto {
  id: string;
  projectId: string;
  folderId: string | null;
  path: string;
  method: string;
  summary: string | null;
  sortOrder: number;
  specData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string | null;
}

export type EndpointSummaryDto = Omit<EndpointDto, 'specData'>;

export function getErrorMessage(err: unknown, fallback = 'Request failed'): string {
  const data = err as { response?: { data?: { message?: string } }; message?: string };
  return data?.response?.data?.message ?? data?.message ?? fallback;
}

export interface LlmModelDto {
  id: string;
  label: string;
  provider: string;
}

export interface ChatSessionDto {
  id: string;
  title: string | null;
  created_by?: string | null;
  created_date: number;
  updated_date?: number | null;
}

export interface ChatMessageDto {
  id: string;
  session_id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  created_date: number;
}

export interface ChatResultDto {
  reply: string;
  threadId: string;
  sessionTitle?: string;
}

export interface AssistantContextDto {
  pathname?: string;
  projectId?: string;
  endpointId?: string;
  tab?: string;
  exampleId?: string;
  mentionedEndpointIds?: string[];
}

export interface AssistantUiEffectDto {
  type: 'navigate' | 'highlight' | 'tab_change';
  projectId?: string;
  endpointId?: string;
  tab?: string;
  exampleId?: string;
  target?: 'url' | 'summary' | 'method' | 'params' | 'headers' | 'body' | 'responses' | 'examples' | 'docs';
}

export type AssistantStreamEventDto =
  | { type: 'token'; delta: string }
  | { type: 'tool_call_start'; toolId: string; toolName: string; args?: Record<string, unknown> }
  | { type: 'tool_call_complete'; toolId: string; toolName: string; resultSummary?: string }
  | { type: 'tool_call_error'; toolId: string; toolName: string; resultSummary?: string }
  | {
      type: 'tool_confirmation_request';
      confirmationId: string;
      toolId: string;
      toolName: string;
      args: Record<string, unknown>;
      summary: string;
    }
  | { type: 'ui_effect'; effect: AssistantUiEffectDto }
  | { type: 'session_info'; threadId: string; sessionTitle?: string }
  | { type: 'done'; fullReply: string; threadId: string }
  | { type: 'error'; message: string };

export async function confirmAssistantTool(
  confirmationId: string,
  approved: boolean
): Promise<{ resolved: boolean }> {
  return unwrap<{ resolved: boolean }>(
    api.post('/assistant/confirm', { confirmationId, approved })
  );
}

export async function chatStream(
  payload: {
    message: string;
    threadId?: string;
    model?: string;
    context?: AssistantContextDto;
  },
  onEvent: (event: AssistantStreamEventDto) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/api/assistant/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    let errMsg = 'Failed to connect to assistant stream';
    try {
      const errJson = await res.json();
      errMsg = errJson.message || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  if (!res.body) {
    throw new Error('ReadableStream not supported in this browser environment');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentEventName = 'message';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        currentEventName = 'message';
        continue;
      }
      if (trimmed.startsWith('event:')) {
        currentEventName = trimmed.slice(6).trim();
        continue;
      }
      if (trimmed.startsWith('data:')) {
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(dataStr) as AssistantStreamEventDto;
          onEvent(parsed);
        } catch {
          // If raw text or non-json data
          if (currentEventName === 'token') {
            onEvent({ type: 'token', delta: dataStr });
          }
        }
      }
    }
  }
}

export class SaveConflictError extends Error {
  serverUpdatedAt: string;

  constructor(serverUpdatedAt: string) {
    super('SAVE_CONFLICT');
    this.name = 'SaveConflictError';
    this.serverUpdatedAt = serverUpdatedAt;
  }
}
