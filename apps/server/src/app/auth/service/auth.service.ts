import { SignJWT } from 'jose'
import * as bcrypt from 'bcryptjs'
import { AccountService } from '../../account/service/account.service'
import { generateProfilePicture } from '../../../lib/string-utils'
import { env } from '../../../configs/env'
import { ForbiddenError, UnauthorizedError } from '../../../configs/exception'
import type { SignUpInput, SignInInput, AuthResult, GoogleProfile } from '../types/auth.types'

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

  getGoogleAuthorizationUrl(state: string, redirectUri: string): string {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Google authentication is not configured')
    }

    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_REDIRECT_URI ?? redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  async signInWithGoogle(code: string, redirectUri: string): Promise<AuthResult> {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI ?? redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenResponse.ok) throw new UnauthorizedError('Google authentication failed')

    const tokens = (await tokenResponse.json()) as { access_token?: string }
    if (!tokens.access_token) throw new UnauthorizedError('Google authentication failed')

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!profileResponse.ok) throw new UnauthorizedError('Unable to read Google profile')

    const profile = (await profileResponse.json()) as GoogleProfile & { email_verified?: boolean }
    if (!profile.email || profile.email_verified !== true) {
      throw new UnauthorizedError('Google email is not verified')
    }

    const email = profile.email.trim().toLowerCase()
    const domain = email.split('@')[1]
    const allowedDomains = env.ALLOWED_EMAIL_DOMAINS.split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
    if (!domain || !allowedDomains.includes(domain)) {
      throw new ForbiddenError('Your email domain is not allowed')
    }

    let account = await this.accountService.findByEmail(email)
    if (!account) {
      account = await this.accountService.create({
        email,
        name: profile.name || email.split('@')[0],
        password: await bcrypt.hash(crypto.randomUUID(), env.BCRYPT_ROUNDS),
        profile_picture: profile.picture || generateProfilePicture(profile.name || email),
        created_by: email,
      })
    }
    if (!account.active) throw new ForbiddenError('Account is deactivated')

    // Backfill profile picture from Google when the account has none yet.
    if (profile.picture && !account.profile_picture) {
      account = await this.accountService.updateProfilePicture(account.id, profile.picture)
    }

    return {
      access_token: await this.signToken(account.id, account.email),
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
