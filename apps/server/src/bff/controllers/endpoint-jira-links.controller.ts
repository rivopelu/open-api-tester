import { Context } from 'hono'
import { AuthAccess, Controller, Delete, Get, Post } from '../../lib/decorators'
import { BadRequestError } from '../../configs/exception'
import { EndpointJiraLinkService } from '../../app/endpoints/service/endpoint-jira-link.service'
import { getUser } from '../../lib/get-user'
import { ResponseHelper } from '../../lib/response-helper'

@Controller()
export class EndpointJiraLinksController {
  constructor(private jiraLinkService: EndpointJiraLinkService = new EndpointJiraLinkService()) {}

  @Get('/endpoints/:id/jira-links')
  @AuthAccess()
  async list(c: Context) {
    const links = await this.jiraLinkService.listByEndpoint(c.req.param('id')!)
    return c.json(ResponseHelper.data(links))
  }

  @Post('/endpoints/:id/jira-links')
  @AuthAccess()
  async create(c: Context) {
    const body = await this.readBody(c)
    const link = await this.jiraLinkService.create({
      endpointId: c.req.param('id'),
      issueKey: typeof body.issueKey === 'string' ? body.issueKey : undefined,
      category: typeof body.category === 'string' ? body.category : undefined,
    })
    return c.json(ResponseHelper.data(link, 'Jira link added successfully'), 201)
  }

  @Delete('/endpoints/:id/jira-links/:linkId')
  @AuthAccess()
  async delete(c: Context) {
    const user = getUser(c)
    if (!user) throw new BadRequestError('Authentication required')
    await this.jiraLinkService.delete(c.req.param('linkId')!, user.sub)
    return c.json(ResponseHelper.success('Jira link removed successfully'))
  }

  private async readBody(c: Context): Promise<Record<string, unknown>> {
    try {
      return await c.req.json()
    } catch {
      throw new BadRequestError('Invalid JSON body')
    }
  }
}

export const endpointJiraLinksController = new EndpointJiraLinksController()
