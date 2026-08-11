import { api, unwrap, type EndpointDto } from '../lib/api';
import type { Endpoint } from '@modern-api-studio/types';

export interface EndpointPayload {
  projectId?: string;
  folderId?: string | null;
  path?: string;
  method?: string;
  summary?: string;
  sortOrder?: number;
  specData?: Record<string, unknown>;
}

export interface EndpointOrderGroup {
  folderId: string | null;
  endpointIds: string[];
}

export interface EndpointRepository {
  listByProject(projectId: string): Promise<EndpointDto[]>;
  get(id: string): Promise<EndpointDto>;
  create(body: EndpointPayload & { projectId: string }): Promise<EndpointDto>;
  update(id: string, body: Omit<EndpointPayload, 'projectId'>): Promise<EndpointDto>;
  updateExamples(id: string, body: Pick<Endpoint, 'requestBody' | 'responses'>): Promise<EndpointDto>;
  reorder(projectId: string, groups: EndpointOrderGroup[]): Promise<EndpointDto[]>;
  remove(id: string): Promise<void>;
}

export const endpointRepository: EndpointRepository = {
  listByProject(projectId) {
    return unwrap<EndpointDto[]>(api.get('/endpoints', { params: { projectId } }));
  },

  get(id) {
    return unwrap<EndpointDto>(api.get(`/endpoints/${id}`));
  },

  create(body) {
    return unwrap<EndpointDto>(api.post('/endpoints', body));
  },

  update(id, body) {
    return unwrap<EndpointDto>(api.put(`/endpoints/${id}`, body));
  },

  updateExamples(id, body) {
    return unwrap<EndpointDto>(api.put(`/endpoints/${id}/examples`, body));
  },

  reorder(projectId, groups) {
    return unwrap<EndpointDto[]>(
      api.put(`/projects/${projectId}/endpoints/order`, { groups }),
    );
  },

  async remove(id) {
    await unwrap<null>(api.delete(`/endpoints/${id}`));
  },
};
