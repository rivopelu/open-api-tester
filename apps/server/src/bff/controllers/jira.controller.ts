import { Context } from 'hono'
import { AuthAccess, Controller, Get } from '../../lib/decorators'
import { BadRequestError } from '../../configs/exception'
import { JiraClient } from '../../app/endpoints/service/jira-client'
import { ResponseHelper } from '../../lib/response-helper'

@Controller()
export class JiraController {
  constructor(private jiraClient: JiraClient = new JiraClient()) {}

  @Get('/jira/issues/search')
  @AuthAccess()
  async search(c: Context) {
    const query = c.req.query('q')?.trim()
    if (!query) return c.json(ResponseHelper.data([]))
    if (!this.jiraClient.isConfigured()) throw new BadRequestError('Jira is not configured')

    const results = await this.jiraClient.searchIssues(query)
    return c.json(ResponseHelper.data(results))
  }
}

export const jiraController = new JiraController()
