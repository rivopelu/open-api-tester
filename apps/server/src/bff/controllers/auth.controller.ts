import { Context } from 'hono'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import { Controller, Post, Get, AuthAccess } from '../../lib/decorators'
import { ResponseHelper } from '../../lib/response-helper'
import { AuthBffService } from '../services/auth-bff.service'
import { UnauthorizedError } from '../../configs/exception'
import { getUser } from '../../lib/get-user'
import { SignUpRequestSchema, SignInRequestSchema } from '../types/request/auth.request'
import { env } from '../../configs/env'

@Controller()
export class AuthController {
  private authBffService = new AuthBffService()

  @Post('/auth/sign-up')
  async signUp(c: Context) {
    const body = SignUpRequestSchema.parse(await c.req.json())
    const result = await this.authBffService.signUp(body)
    return c.json(ResponseHelper.data(result, 'Account created successfully'), 201)
  }

  @Post('/auth/sign-in')
  async signIn(c: Context) {
    const body = SignInRequestSchema.parse(await c.req.json())
    const result = await this.authBffService.signIn(body)
    return c.json(ResponseHelper.data(result))
  }

  @Get('/auth/google')
  async google(c: Context) {
    const state = crypto.randomUUID()
    const redirectUri = `${new URL(c.req.url).origin}${env.API_PREFIX}/auth/google/callback`
    await setSignedCookie(c, 'google_oauth_state', state, env.JWT_SECRET, {
      httpOnly: true,
      maxAge: 600,
      path: `${env.API_PREFIX}/auth/google`,
      sameSite: 'Lax',
      secure: new URL(c.req.url).protocol === 'https:',
    })
    return c.redirect(this.authBffService.getGoogleAuthorizationUrl(state, redirectUri))
  }

  @Get('/auth/google/callback')
  async googleCallback(c: Context) {
    const requestOrigin = new URL(c.req.url).origin
    const configuredOrigins = env.ALLOWED_ORIGINS.split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    const clientUrl = env.CLIENT_URL?.replace(/\/$/, '')
      ?? configuredOrigins.find((origin) => origin !== '*' && !origin.includes('localhost'))
      ?? configuredOrigins.find((origin) => origin !== '*')
      ?? requestOrigin
    const error = c.req.query('error')
    const code = c.req.query('code')
    const state = c.req.query('state')
    const storedState = await getSignedCookie(c, env.JWT_SECRET, 'google_oauth_state')
    deleteCookie(c, 'google_oauth_state', { path: `${env.API_PREFIX}/auth/google` })

    if (error) return c.redirect(`${clientUrl}/auth#error=${encodeURIComponent(error)}`)
    if (!code || !state || !storedState || state !== storedState) {
      return c.redirect(`${clientUrl}/auth#error=${encodeURIComponent('Invalid OAuth state')}`)
    }

    try {
      const redirectUri = `${new URL(c.req.url).origin}${env.API_PREFIX}/auth/google/callback`
      const result = await this.authBffService.signInWithGoogle(code, redirectUri)
      return c.redirect(`${clientUrl}/auth#token=${encodeURIComponent(result.access_token)}`)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Google authentication failed'
      return c.redirect(`${clientUrl}/auth#error=${encodeURIComponent(message)}`)
    }
  }

  @Get('/auth/me')
  @AuthAccess()
  async me(c: Context) {
    const user = getUser(c)
    if (!user) throw new UnauthorizedError()
    const result = await this.authBffService.getProfile(user.sub)
    return c.json(ResponseHelper.data(result))
  }
}

export const authController = new AuthController()
