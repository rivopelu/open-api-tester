import { api, unwrap, type JiraIssueMatchDto } from '../lib/api';

export interface JiraRepository {
  searchIssues(query: string): Promise<JiraIssueMatchDto[]>;
}

export const jiraRepository: JiraRepository = {
  searchIssues(query) {
    return unwrap<JiraIssueMatchDto[]>(api.get('/jira/issues/search', { params: { q: query } }));
  },
};
