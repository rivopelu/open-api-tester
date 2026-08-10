import { Context } from 'hono'
import { Controller, Get, AuthAccess } from '../../lib/decorators'
import { ResponseHelper } from '../../lib/response-helper'
import { getPagination } from '../../lib/get-pagination'
import { AccountBffService } from '../services/account-bff.service'

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
}

export const accountController = new AccountController()
