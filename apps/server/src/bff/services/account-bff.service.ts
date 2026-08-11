import { AccountService } from '../../app/account/service/account.service'
import type { AccountListQuery, AccountListResult } from '../../app/account/types/account.types'

export class AccountBffService {
  constructor(private accountService: AccountService = new AccountService()) {}

  async list(query: AccountListQuery): Promise<AccountListResult> {
    return this.accountService.list(query)
  }

  async rotateMcpToken(accountId: string): Promise<string> {
    return this.accountService.rotateMcpToken(accountId)
  }

  async revokeMcpToken(accountId: string): Promise<void> {
    return this.accountService.revokeMcpToken(accountId)
  }

  async getEnvironments(accountId: string) { return this.accountService.getEnvironments(accountId) }

  async saveEnvironments(accountId: string, environments: Array<{ id: string; name: string; variables: Record<string, string> }>, activeEnvironmentId: string | null) {
    return this.accountService.saveEnvironments(accountId, environments, activeEnvironmentId)
  }
}
