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
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  response_data?: T;
}

async function unwrap<T>(request: Promise<unknown>): Promise<T> {
  const res = await request;
  const body = res as { data: ApiEnvelope<T> };
  const envelope = body.data;
  if (!envelope.success) {
    throw new Error(envelope.message ?? 'Request failed');
  }
  return envelope.response_data as T;
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

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
}

export interface ProjectDetailDto {
  project: ProjectDto;
  endpoints: EndpointDto[];
}

export interface EndpointDto {
  id: string;
  projectId: string;
  path: string;
  method: string;
  summary: string | null;
  specData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string | null;
}

export function getErrorMessage(err: unknown, fallback = 'Request failed'): string {
  const data = err as { response?: { data?: { message?: string } }; message?: string };
  return data?.response?.data?.message ?? data?.message ?? fallback;
}

export class SaveConflictError extends Error {
  serverUpdatedAt: string;

  constructor(serverUpdatedAt: string) {
    super('SAVE_CONFLICT');
    this.name = 'SaveConflictError';
    this.serverUpdatedAt = serverUpdatedAt;
  }
}

// ─── Auth endpoints ──────────────────────────────────────────────────────────

export const authApi = {
  async signIn(email: string, password: string): Promise<AuthResult> {
    return unwrap<AuthResult>(api.post('/auth/sign-in', { email, password }));
  },

  async signUp(name: string, email: string, password: string): Promise<AuthResult> {
    return unwrap<AuthResult>(api.post('/auth/sign-up', { name, email, password }));
  },

  async me(): Promise<AuthAccount> {
    return unwrap<AuthAccount>(api.get('/auth/me'));
  },
};

// ─── Project endpoints ───────────────────────────────────────────────────────

export const projectApi = {
  async list(): Promise<ProjectDto[]> {
    return unwrap<ProjectDto[]>(api.get('/projects'));
  },

  async get(id: string): Promise<ProjectDetailDto> {
    return unwrap<ProjectDetailDto>(api.get(`/projects/${id}`));
  },

  async create(name: string): Promise<ProjectDto> {
    return unwrap<ProjectDto>(api.post('/projects', { name }));
  },

  async update(
    id: string,
    body: { name?: string },
  ): Promise<ProjectDto> {
    return unwrap<ProjectDto>(
      api.put(`/projects/${id}`, {
        ...(body.name !== undefined ? { name: body.name } : {}),
      }),
    );
  },

  async remove(id: string): Promise<void> {
    await unwrap<null>(api.delete(`/projects/${id}`));
  },
};

// ─── Endpoint endpoints (per-endpoint CRUD) ──────────────────────────────────

export const endpointApi = {
  async listByProject(projectId: string): Promise<EndpointDto[]> {
    return unwrap<EndpointDto[]>(api.get('/endpoints', { params: { projectId } }));
  },

  async get(id: string): Promise<EndpointDto> {
    return unwrap<EndpointDto>(api.get(`/endpoints/${id}`));
  },

  async create(body: {
    projectId: string;
    path?: string;
    method?: string;
    summary?: string;
    specData?: Record<string, unknown>;
  }): Promise<EndpointDto> {
    return unwrap<EndpointDto>(api.post('/endpoints', body));
  },

  async update(
    id: string,
    body: {
      path?: string;
      method?: string;
      summary?: string;
      specData?: Record<string, unknown>;
    },
  ): Promise<EndpointDto> {
    return unwrap<EndpointDto>(api.put(`/endpoints/${id}`, body));
  },

  async remove(id: string): Promise<void> {
    await unwrap<null>(api.delete(`/endpoints/${id}`));
  },
};

// ─── Proxy endpoint (API runner) ─────────────────────────────────────────────



