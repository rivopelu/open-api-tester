import { AccountRepository } from '../repository/account.repository'
import type { Account } from '../entity/account.entity'
import type {
  CreateAccountInput,
  AccountListQuery,
  AccountListResult,
} from '../types/account.types'
import { createHash, randomBytes } from 'node:crypto'
import { NotFoundError } from '../../../configs/exception'

export class AccountService {
  constructor(private repository: AccountRepository = new AccountRepository()) {}

  async findByEmail(email: string): Promise<Account | null> {
    return this.repository.findByEmail(email)
  }

  async findById(id: string): Promise<Account | null> {
    return this.repository.findById(id)
  }

  async list(query: AccountListQuery): Promise<AccountListResult> {
    return this.repository.findAll(query)
  }

  async create(data: CreateAccountInput): Promise<Account> {
    return this.repository.insert({
      email: data.email,
      name: data.name,
      password: data.password,
      profile_picture: data.profile_picture,
      created_by: data.created_by,
    })
  }

  async updateProfilePicture(id: string, picture: string): Promise<Account> {
    return this.repository.update(id, { profile_picture: picture })
  }

  async authenticateMcpToken(token: string): Promise<Account | null> {
    return this.repository.findActiveByMcpTokenHash(this.hashMcpToken(token))
  }

  async rotateMcpToken(id: string): Promise<string> {
    const account = await this.repository.findById(id)
    if (!account) throw new NotFoundError('Account not found')
    if (account.mcp_token) return account.mcp_token
    const token = `mas_${randomBytes(32).toString('base64url')}`
    await this.repository.update(id, { mcp_token: token, mcp_token_hash: this.hashMcpToken(token) })
    return token
  }

  async getMcpToken(id: string): Promise<string | null> {
    const account = await this.repository.findById(id)
    if (!account) throw new NotFoundError('Account not found')
    return account.mcp_token
  }

  async revokeMcpToken(id: string): Promise<void> {
    await this.repository.update(id, { mcp_token: null, mcp_token_hash: null })
  }

  async getEnvironments(id: string) {
    const account = await this.repository.findById(id)
    if (!account) throw new NotFoundError('Account not found')
    return {
      environments: account.environments,
      activeEnvironmentId: account.active_environment_id,
    }
  }

  async saveEnvironments(
    id: string,
    environments: Array<{ id: string; name: string; variables: Record<string, string> }>,
    activeEnvironmentId: string | null,
  ): Promise<void> {
    await this.repository.update(id, { environments, active_environment_id: activeEnvironmentId })
  }

  private hashMcpToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
