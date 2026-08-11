import { Context } from 'hono'
import { Controller, Get, Post, Put, Delete, AuthAccess } from '../../lib/decorators'
import { ResponseHelper } from '../../lib/response-helper'
import { EndpointService } from '../../app/endpoints/service/endpoint.service'
import { BadRequestError } from '../../configs/exception'
import { getUser } from '../../lib/get-user'
import type { RequestBodyDefinition, ResponseDefinition } from '@modern-api-studio/types'

@Controller()
export class EndpointsController {
  constructor(private endpointService: EndpointService = new EndpointService()) {}

  @Get('/endpoints')
  @AuthAccess()
  async listByProject(c: Context) {
    const projectId = c.req.query('projectId')
    if (!projectId) throw new BadRequestError('projectId query param is required')
    const endpoints = await this.endpointService.listByProject(projectId)
    return c.json(ResponseHelper.data(endpoints))
  }

  @Get('/endpoints/:id')
  @AuthAccess()
  async get(c: Context) {
    const endpoint = await this.endpointService.get(c.req.param('id')!)
    return c.json(ResponseHelper.data(endpoint))
  }

  @Post('/endpoints')
  @AuthAccess()
  async create(c: Context) {
    const user = getUser(c)
    if (!user) throw new BadRequestError('Authentication required')

    let body: Record<string, unknown>
    try {
      body = await c.req.json()
    } catch {
      throw new BadRequestError('Invalid JSON body')
    }
    const projectId = String(body.projectId ?? '')
    if (!projectId) throw new BadRequestError('projectId is required')

    const endpoint = await this.endpointService.create({
      projectId,
      folderId: typeof body.folderId === 'string' ? body.folderId : null,
      path: typeof body.path === 'string' ? body.path : undefined,
      method: typeof body.method === 'string' ? body.method : undefined,
      summary: typeof body.summary === 'string' ? body.summary : undefined,
      specData: typeof body.specData === 'object' && body.specData !== null
        ? body.specData as Record<string, unknown>
        : undefined,
    })
    return c.json(ResponseHelper.data(endpoint, 'Endpoint created successfully'), 201)
  }

  @Put('/endpoints/:id')
  @AuthAccess()
  async update(c: Context) {
    let body: Record<string, unknown>
    try {
      body = await c.req.json()
    } catch {
      throw new BadRequestError('Invalid JSON body')
    }

    const endpoint = await this.endpointService.update(c.req.param('id')!, {
      folderId: body.folderId === null || typeof body.folderId === 'string'
        ? body.folderId
        : undefined,
      path: typeof body.path === 'string' ? body.path : undefined,
      method: typeof body.method === 'string' ? body.method : undefined,
      summary: typeof body.summary === 'string' ? body.summary : undefined,
      specData: typeof body.specData === 'object' && body.specData !== null
        ? body.specData as Record<string, unknown>
        : undefined,
    })
    return c.json(ResponseHelper.data(endpoint, 'Endpoint updated successfully'))
  }

  @Put('/endpoints/:id/examples')
  @AuthAccess()
  async updateExamples(c: Context) {
    let body: Record<string, unknown>
    try {
      body = await c.req.json()
    } catch {
      throw new BadRequestError('Invalid JSON body')
    }
    if (!Array.isArray(body.responses)) throw new BadRequestError('responses must be an array')
    if (body.requestBody !== undefined && (typeof body.requestBody !== 'object' || body.requestBody === null)) {
      throw new BadRequestError('requestBody must be an object')
    }
    const requestExamples = (body.requestBody as RequestBodyDefinition | undefined)?.examples ?? []
    const responseExamples = (body.responses as ResponseDefinition[]).flatMap((response) => response.examples ?? [])
    for (const example of [...requestExamples, ...responseExamples]) {
      if (!example || typeof example.value !== 'string') throw new BadRequestError('Example value must be a JSON string')
      try {
        JSON.parse(example.value)
      } catch {
        throw new BadRequestError(`Example ${example.name || example.id} contains invalid JSON`)
      }
    }

    const endpoint = await this.endpointService.updateExamples(c.req.param('id')!, {
      requestBody: body.requestBody as RequestBodyDefinition | undefined,
      responses: body.responses as ResponseDefinition[],
    })
    return c.json(ResponseHelper.data(endpoint, 'Endpoint examples updated successfully'))
  }

  @Delete('/endpoints/:id')
  @AuthAccess()
  async delete(c: Context) {
    const user = getUser(c)
    if (!user) throw new BadRequestError('Authentication required')
    await this.endpointService.delete(c.req.param('id')!, user.sub)
    return c.json(ResponseHelper.success('Endpoint deleted successfully'))
  }
}

export const endpointsController = new EndpointsController()

export function createEndpointsController(service?: EndpointService) {
  return new EndpointsController(service)
}
