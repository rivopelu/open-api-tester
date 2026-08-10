import type { Account } from '../../account/entity/account.entity'

export interface SignUpInput {
  email: string
  name: string
  password: string
}

export interface SignInInput {
  email: string
  password: string
}

export interface AuthResult {
  access_token: string
  account: Pick<Account, 'id' | 'email' | 'name' | 'profile_picture'>
}
