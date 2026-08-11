import { api, unwrap, type EndpointDto } from '../lib/api';

export interface EndpointPayload {
  projectId?: string;
  folderId?: string | null;
  path?: string;
  method?: string;
  summary?: string;
  specData?: Record<string, unknown>;
}

export interface EndpointRepository {
  listByProject(projectId: string): Promise<EndpointDto[]>;
  get(id: string): Promise<EndpointDto>;
  create(body: EndpointPayload & { projectId: string }): Promise<EndpointDto>;
  update(id: string, body: Omit<EndpointPayload, 'projectId'>): Promise<EndpointDto>;
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

  async remove(id) {
    await unwrap<null>(api.delete(`/endpoints/${id}`));
  },
};
