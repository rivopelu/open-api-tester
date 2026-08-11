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

export class SaveConflictError extends Error {
  serverUpdatedAt: string;

  constructor(serverUpdatedAt: string) {
    super('SAVE_CONFLICT');
    this.name = 'SaveConflictError';
    this.serverUpdatedAt = serverUpdatedAt;
  }
}
