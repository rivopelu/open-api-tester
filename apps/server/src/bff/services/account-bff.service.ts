import { AccountService } from '../../app/account/service/account.service'
import type { AccountListQuery, AccountListResult } from '../../app/account/types/account.types'

export class AccountBffService {
  constructor(private accountService: AccountService = new AccountService()) {}

  async list(query: AccountListQuery): Promise<AccountListResult> {
    return this.accountService.list(query)
  }
}
