import { SignJWT } from 'jose'
import * as bcrypt from 'bcryptjs'
import { AccountService } from '../../account/service/account.service'
import { generateProfilePicture } from '../../../lib/string-utils'
import { env } from '../../../configs/env'
import type { SignUpInput, SignInInput, AuthResult } from '../types/auth.types'

export class AuthService {
  constructor(private accountService = new AccountService()) {}

  async signUp(input: SignUpInput): Promise<AuthResult> {
    const existing = await this.accountService.findByEmail(input.email)
    if (existing) {
      throw new Error('Email already registered')
    }

    const hashed = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS)
    const picture = generateProfilePicture(input.name)

    const account = await this.accountService.create({
      email: input.email,
      name: input.name,
      password: hashed,
      profile_picture: picture,
      created_by: input.email,
    })

    const token = await this.signToken(account.id, account.email)

    return {
      access_token: token,
      account: {
        id: account.id,
        email: account.email,
        name: account.name,
        profile_picture: account.profile_picture,
      },
    }
  }

  async signIn(input: SignInInput): Promise<AuthResult> {
    const account = await this.accountService.findByEmail(input.email)
    if (!account) {
      throw new Error('Invalid email or password')
    }

    if (!account.active) {
      throw new Error('Account is deactivated')
    }

    const valid = await bcrypt.compare(input.password, account.password)
    if (!valid) {
      throw new Error('Invalid email or password')
    }

    const token = await this.signToken(account.id, account.email)

    return {
      access_token: token,
      account: {
        id: account.id,
        email: account.email,
        name: account.name,
        profile_picture: account.profile_picture,
      },
    }
  }

  async getProfile(id: string) {
    const account = await this.accountService.findById(id)
    if (!account) {
      throw new Error('Account not found')
    }
    return {
      id: account.id,
      email: account.email,
      name: account.name,
      profile_picture: account.profile_picture,
    }
  }

  private async signToken(sub: string, email: string): Promise<string> {
    const secret = new TextEncoder().encode(env.JWT_SECRET)

    return new SignJWT({ sub, email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(env.JWT_ISSUER)
      .setExpirationTime('7d')
      .sign(secret)
  }
}
