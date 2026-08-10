import { AccountRepository } from '../repository/account.repository'
import type { Account } from '../entity/account.entity'
import type {
  CreateAccountInput,
  AccountListQuery,
  AccountListResult,
} from '../types/account.types'

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
}
