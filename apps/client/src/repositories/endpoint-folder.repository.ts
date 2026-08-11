import { api, unwrap, type EndpointFolderDto } from '../lib/api';

export interface EndpointFolderPayload {
  projectId?: string;
  parentId?: string | null;
  name?: string;
  sortOrder?: number;
}

export interface EndpointFolderRepository {
  listByProject(projectId: string): Promise<EndpointFolderDto[]>;
  create(body: EndpointFolderPayload & { projectId: string; name: string }): Promise<EndpointFolderDto>;
  update(id: string, body: Omit<EndpointFolderPayload, 'projectId'>): Promise<EndpointFolderDto>;
  remove(id: string): Promise<void>;
}

export const endpointFolderRepository: EndpointFolderRepository = {
  listByProject(projectId) {
    return unwrap<EndpointFolderDto[]>(api.get('/endpoint-folders', { params: { projectId } }));
  },

  create(body) {
    return unwrap<EndpointFolderDto>(api.post('/endpoint-folders', body));
  },

  update(id, body) {
    return unwrap<EndpointFolderDto>(api.put(`/endpoint-folders/${id}`, body));
  },

  async remove(id) {
    await unwrap<null>(api.delete(`/endpoint-folders/${id}`));
  },
};
