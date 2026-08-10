import { Context } from 'hono'
import { Controller, Get, Post, Put, Delete, AuthAccess } from '../../lib/decorators'
import { ResponseHelper } from '../../lib/response-helper'
import { ProjectService } from '../../app/projects/service/project.service'
import { UnauthorizedError, BadRequestError } from '../../configs/exception'
import { getUser } from '../../lib/get-user'
import { CreateProjectRequestSchema, UpdateProjectRequestSchema } from '../types/request/project.request'

@Controller()
export class ProjectsController {
  constructor(private projectService: ProjectService = new ProjectService()) {}

  @Get('/projects')
  @AuthAccess()
  async list(c: Context) {
    const projects = await this.projectService.list()
    return c.json(ResponseHelper.data(projects))
  }

  @Get('/projects/:id')
  @AuthAccess()
  async get(c: Context) {
    const projects = await this.projectService.get(c.req.param('id')!)
    return c.json(ResponseHelper.data(projects))
  }

  @Post('/projects')
  @AuthAccess()
  async create(c: Context) {
    const user = getUser(c)
    if (!user) throw new UnauthorizedError()

    let body: { name: string }
    try {
      body = await c.req.json()
    } catch {
      throw new BadRequestError('Invalid JSON body')
    }
    const parsed = CreateProjectRequestSchema.parse(body)

    const project = await this.projectService.create({
      name: parsed.name,
      created_by: user.sub,
    })
    return c.json(ResponseHelper.data(project, 'Project created successfully'), 201)
  }

  @Put('/projects/:id')
  @AuthAccess()
  async update(c: Context) {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      throw new BadRequestError('Invalid JSON body')
    }
    const parsed = UpdateProjectRequestSchema.parse(body)
    const project = await this.projectService.update(c.req.param('id')!, parsed)
    return c.json(ResponseHelper.data(project, 'Project updated successfully'))
  }

  @Delete('/projects/:id')
  @AuthAccess()
  async delete(c: Context) {
    const user = getUser(c)
    if (!user) throw new UnauthorizedError()
    await this.projectService.delete(c.req.param('id')!, user.sub)
    return c.json(ResponseHelper.success('Project deleted successfully'))
  }
}

export const projectsController = new ProjectsController()

export function createProjectsController(service?: ProjectService) {
  return new ProjectsController(service)
}