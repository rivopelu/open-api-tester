import {
  api,
  unwrap,
  type ProjectDetailDto,
  type ProjectDto,
} from '../lib/api';

export interface ProjectRepository {
  list(): Promise<ProjectDto[]>;
  get(id: string): Promise<ProjectDetailDto>;
  create(name: string): Promise<ProjectDto>;
  update(id: string, body: { name?: string }): Promise<ProjectDto>;
  remove(id: string): Promise<void>;
}

export const projectRepository: ProjectRepository = {
  list() {
    return unwrap<ProjectDto[]>(api.get('/projects'));
  },

  get(id) {
    return unwrap<ProjectDetailDto>(api.get(`/projects/${id}`));
  },

  create(name) {
    return unwrap<ProjectDto>(api.post('/projects', { name }));
  },

  update(id, body) {
    return unwrap<ProjectDto>(api.put(`/projects/${id}`, body));
  },

  async remove(id) {
    await unwrap<null>(api.delete(`/projects/${id}`));
  },
};
