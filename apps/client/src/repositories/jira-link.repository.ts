import { api, unwrap, type JiraLinkDto } from '../lib/api';

export interface JiraLinkPayload {
  issueKey: string;
  category?: string;
}

export interface JiraLinkRepository {
  listByEndpoint(endpointId: string): Promise<JiraLinkDto[]>;
  create(endpointId: string, body: JiraLinkPayload): Promise<JiraLinkDto>;
  remove(endpointId: string, linkId: string): Promise<void>;
}

export const jiraLinkRepository: JiraLinkRepository = {
  listByEndpoint(endpointId) {
    return unwrap<JiraLinkDto[]>(api.get(`/endpoints/${endpointId}/jira-links`));
  },

  create(endpointId, body) {
    return unwrap<JiraLinkDto>(api.post(`/endpoints/${endpointId}/jira-links`, body));
  },

  async remove(endpointId, linkId) {
    await unwrap<null>(api.delete(`/endpoints/${endpointId}/jira-links/${linkId}`));
  },
};
