import { Context } from 'hono'
import { Controller, Get, Post, Put, Delete, AuthAccess } from '../../lib/decorators'
import { ResponseHelper } from '../../lib/response-helper'
import { ProjectService } from '../../app/projects/service/project.service'
import { EndpointService } from '../../app/endpoints/service/endpoint.service'
import { EndpointFolderService } from '../../app/endpoint-folders/service/endpoint-folder.service'
import { UnauthorizedError, BadRequestError } from '../../configs/exception'
import { getUser } from '../../lib/get-user'
import {
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
} from '../types/request/project.request'
import { AccountService } from '../../app/account/service/account.service'

@Controller()
export class ProjectsController {
  constructor(
    private projectService: ProjectService = new ProjectService(),
    private endpointService: EndpointService = new EndpointService(),
    private endpointFolderService: EndpointFolderService = new EndpointFolderService(),
    private accountService: AccountService = new AccountService(),
  ) {}

  @Get('/projects')
  @AuthAccess()
  async list(c: Context) {
    const projects = await this.projectService.list()
    const creators = new Map(
      await Promise.all(
        Array.from(new Set(projects.map((project) => project.createdById).filter(Boolean))).map(
          async (id) => {
            const account = await this.accountService.findById(id!)
            return [id, account] as const
          },
        ),
      ),
    )
    return c.json(
      ResponseHelper.data(
        projects.map((project) => {
          const creator = project.createdById ? creators.get(project.createdById) : null
          return {
            ...project,
            creator: creator
              ? {
                  name: creator.name,
                  email: creator.email,
                  profilePicture: creator.profile_picture,
                }
              : null,
          }
        }),
      ),
    )
  }

  @Get('/projects/:id')
  @AuthAccess()
  async get(c: Context) {
    const id = c.req.param('id')!
    const project = await this.projectService.get(id)
    const endpoints = await this.endpointService.listSummaryByProject(id)
    const folders = await this.endpointFolderService.listByProject(id)
    return c.json(ResponseHelper.data({ project, endpoints, folders }))
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

export function createProjectsController(
  service?: ProjectService,
  endpointService?: EndpointService,
  endpointFolderService?: EndpointFolderService,
) {
  return new ProjectsController(service, endpointService, endpointFolderService)
}
