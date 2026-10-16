import { env } from '../../../configs/env'
import { BadRequestError, ConflictError, NotFoundError } from '../../../configs/exception'
import type { EndpointJiraLinkRecord } from '../entity/endpoint-jira-link.entity'
import { EndpointJiraLinkRepository } from '../repository/endpoint-jira-link.repository'
import { EndpointService } from './endpoint.service'
import { JiraClient, type JiraIssueSummary } from './jira-client'

const ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/

export interface JiraLinkItem {
  id: string
  endpointId: string
  category: string
  issueKey: string
  issueUrl: string
  jira: JiraIssueSummary | null
  jiraError?: string
}

export interface CreateJiraLinkInput {
  endpointId?: string
  issueKey?: string
  category?: string
}

export class EndpointJiraLinkService {
  constructor(
    private repository: EndpointJiraLinkRepository = new EndpointJiraLinkRepository(),
    private endpointService: EndpointService = new EndpointService(),
    private jiraClient: JiraClient = new JiraClient(),
  ) {}

  private issueUrl(issueKey: string): string {
    return `${env.JIRA_BASE_URL ?? ''}/browse/${issueKey}`
  }

  private async toItem(row: EndpointJiraLinkRecord): Promise<JiraLinkItem> {
    const base = {
      id: row.id,
      endpointId: row.endpoint_id,
      category: row.category,
      issueKey: row.issue_key,
      issueUrl: this.issueUrl(row.issue_key),
    }
    if (!this.jiraClient.isConfigured()) {
      return { ...base, jira: null, jiraError: 'Jira is not configured' }
    }
    try {
      const jira = await this.jiraClient.getIssue(row.issue_key)
      return { ...base, jira, jiraError: jira ? undefined : 'Issue not found' }
    } catch {
      return { ...base, jira: null, jiraError: 'Unable to fetch Jira issue details' }
    }
  }

  async listByEndpoint(endpointId: string): Promise<JiraLinkItem[]> {
    const rows = await this.repository.findByEndpoint(endpointId)
    return Promise.all(rows.map((row) => this.toItem(row)))
  }

  async create(input: CreateJiraLinkInput): Promise<JiraLinkItem> {
    if (!input.endpointId) throw new BadRequestError('Endpoint is required')
    const issueKey = input.issueKey?.trim().toUpperCase()
    if (!issueKey || !ISSUE_KEY_PATTERN.test(issueKey)) {
      throw new BadRequestError('A valid Jira issue key is required, e.g. BE-1234')
    }

    await this.endpointService.get(input.endpointId)

    if (this.jiraClient.isConfigured()) {
      const issue = await this.jiraClient.getIssue(issueKey)
      if (!issue) throw new BadRequestError('Jira issue not found')
    }

    let row: EndpointJiraLinkRecord
    try {
      row = await this.repository.insert({
        endpoint_id: input.endpointId,
        issue_key: issueKey,
        category: input.category?.trim() ?? '',
      })
    } catch (error) {
      const pgErrorCode =
        (error as { code?: string }).code ?? (error as { cause?: { code?: string } }).cause?.code
      if (pgErrorCode === '23505') {
        throw new ConflictError('This Jira issue is already linked to this endpoint')
      }
      throw error
    }
    return this.toItem(row)
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new NotFoundError('Jira link not found')
    await this.repository.softDelete(id, deletedBy)
  }
}
