import { Context } from 'hono'
import { Controller, Get, Post, Delete, AuthAccess } from '../../lib/decorators'
import { ResponseHelper } from '../../lib/response-helper'
import { getPagination } from '../../lib/get-pagination'
import { AccountBffService } from '../services/account-bff.service'
import { getUser } from '../../lib/get-user'
import { BadRequestError, UnauthorizedError } from '../../configs/exception'

@Controller()
@AuthAccess()
export class AccountController {
  constructor(private accountBffService: AccountBffService = new AccountBffService()) {}

  @Get('/accounts')
  async list(c: Context) {
    const { page, size, q, sort, order } = getPagination(c)

    const result = await this.accountBffService.list({ page, size, q, sort, order })

    return c.json(ResponseHelper.paginated(result.items, { page, size, totalData: result.total }))
  }

  @Post('/account/mcp-token')
  async rotateMcpToken(c: Context) {
    const user = getUser(c)
    if (!user) throw new UnauthorizedError()
    const token = await this.accountBffService.rotateMcpToken(user.sub)
    return c.json(ResponseHelper.data({ token }, 'MCP token generated successfully'))
  }

  @Delete('/account/mcp-token')
  async revokeMcpToken(c: Context) {
    const user = getUser(c)
    if (!user) throw new UnauthorizedError()
    await this.accountBffService.revokeMcpToken(user.sub)
    return c.json(ResponseHelper.success('MCP token revoked successfully'))
  }

  @Get('/account/environments')
  async getEnvironments(c: Context) {
    const user = getUser(c)
    if (!user) throw new UnauthorizedError()
    return c.json(ResponseHelper.data(await this.accountBffService.getEnvironments(user.sub)))
  }

  @Post('/account/environments')
  async saveEnvironments(c: Context) {
    const user = getUser(c)
    if (!user) throw new UnauthorizedError()
    const body = await c.req.json().catch(() => null) as { environments?: Array<{ id: string; name: string; variables: Record<string, string> }>; activeEnvironmentId?: string | null } | null
    if (!body || !Array.isArray(body.environments)) throw new BadRequestError('Invalid environments')
    await this.accountBffService.saveEnvironments(user.sub, body.environments, body.activeEnvironmentId ?? null)
    return c.json(ResponseHelper.success('Environments saved successfully'))
  }
}

export const accountController = new AccountController()
