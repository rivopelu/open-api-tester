import { Context } from 'hono'
import { Controller, Post, Get, AuthAccess } from '../../lib/decorators'
import { ResponseHelper } from '../../lib/response-helper'
import { AuthBffService } from '../services/auth-bff.service'
import { UnauthorizedError } from '../../configs/exception'
import { getUser } from '../../lib/get-user'
import { SignUpRequestSchema, SignInRequestSchema } from '../types/request/auth.request'

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
