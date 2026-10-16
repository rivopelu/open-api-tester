import { env } from '../../../configs/env'

export type JiraStatusCategory = 'new' | 'indeterminate' | 'done'

export interface JiraIssueSummary {
  key: string
  summary: string
  status: string
  statusCategory: JiraStatusCategory
  issueType: string
  assignee: string | null
  url: string
}

interface JiraIssueResponse {
  key: string
  fields: {
    summary: string
    status: { name: string; statusCategory: { key: string } }
    issuetype: { name: string }
    assignee: { displayName: string } | null
  }
}

export interface JiraIssueMatch {
  key: string
  summary: string
}

interface JiraIssuePickerResponse {
  sections: { issues: { key: string; summaryText?: string; summary?: string }[] }[]
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '')
}

export class JiraClient {
  isConfigured(): boolean {
    return Boolean(env.JIRA_BASE_URL && env.JIRA_EMAIL && env.JIRA_API_TOKEN)
  }

  private authHeader(): string {
    return `Basic ${Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString('base64')}`
  }

  async getIssue(issueKey: string): Promise<JiraIssueSummary | null> {
    if (!this.isConfigured()) {
      throw new Error('Jira is not configured')
    }

    const response = await fetch(
      `${env.JIRA_BASE_URL}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=summary,status,assignee,issuetype`,
      { headers: { Authorization: this.authHeader(), Accept: 'application/json' } },
    )

    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Jira request failed with status ${response.status}`)
    }

    const issue = (await response.json()) as JiraIssueResponse
    const statusCategory = issue.fields.status.statusCategory.key as JiraStatusCategory

    return {
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      statusCategory:
        statusCategory === 'new' || statusCategory === 'done' ? statusCategory : 'indeterminate',
      issueType: issue.fields.issuetype.name,
      assignee: issue.fields.assignee?.displayName ?? null,
      url: `${env.JIRA_BASE_URL}/browse/${issue.key}`,
    }
  }

  async searchIssues(query: string): Promise<JiraIssueMatch[]> {
    if (!this.isConfigured()) {
      throw new Error('Jira is not configured')
    }

    const response = await fetch(
      `${env.JIRA_BASE_URL}/rest/api/3/issue/picker?query=${encodeURIComponent(query)}`,
      { headers: { Authorization: this.authHeader(), Accept: 'application/json' } },
    )
    if (!response.ok) {
      throw new Error(`Jira request failed with status ${response.status}`)
    }

    const payload = (await response.json()) as JiraIssuePickerResponse
    return payload.sections.flatMap((section) =>
      section.issues.map((issue) => ({
        key: issue.key,
        summary: stripHtml(issue.summaryText ?? issue.summary ?? ''),
      })),
    )
  }
}
