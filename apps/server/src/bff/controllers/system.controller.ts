import { Context } from 'hono'
import { Controller, Get, Post } from '../../lib/decorators'
import { ResponseHelper } from '../../lib/response-helper'
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
} from '../../configs/exception'
import { SystemBffService } from '../services/system-bff.service'

@Controller()
export class SystemController {
  private systemBffService = new SystemBffService()

  @Get('/ping')
  ping(c: Context) {
    return c.json(ResponseHelper.data(this.systemBffService.ping()))
  }

  @Get('/bad-request')
  badRequest(_c: Context) {
    throw new BadRequestError('Invalid input provided')
  }

  @Get('/unauthorized')
  unauthorized(_c: Context) {
    throw new UnauthorizedError('Missing or invalid token')
  }

  @Get('/forbidden')
  forbidden(_c: Context) {
    throw new ForbiddenError('Insufficient permissions')
  }

  @Get('/not-found')
  notFound(_c: Context) {
    throw new NotFoundError('Resource not found')
  }

  @Post('/conflict')
  conflict(_c: Context) {
    throw new ConflictError('Resource already exists')
  }

  @Post('/validation-error')
  validationError(_c: Context) {
    throw new ValidationError('Validation failed', [
      { field: 'email', message: 'Invalid email format' },
      { field: 'age', message: 'Must be at least 18' },
    ])
  }

  @Get('/internal-error')
  internalError(_c: Context) {
    throw new InternalServerError('Something went wrong')
  }
}

export const systemController = new SystemController()
