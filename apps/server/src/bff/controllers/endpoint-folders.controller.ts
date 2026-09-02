import { Context } from 'hono'
import { AuthAccess, Controller, Delete, Get, Post, Put } from '../../lib/decorators'
import { BadRequestError } from '../../configs/exception'
import { EndpointFolderService } from '../../app/endpoint-folders/service/endpoint-folder.service'
import { getUser } from '../../lib/get-user'
import { ResponseHelper } from '../../lib/response-helper'

@Controller()
export class EndpointFoldersController {
  constructor(private folderService: EndpointFolderService = new EndpointFolderService()) {}

  @Get('/endpoint-folders')
  @AuthAccess()
  async list(c: Context) {
    const projectId = c.req.query('projectId')
    if (!projectId) throw new BadRequestError('projectId query param is required')
    return c.json(ResponseHelper.data(await this.folderService.listByProject(projectId)))
  }

  @Post('/endpoint-folders')
  @AuthAccess()
  async create(c: Context) {
    const body = await this.readBody(c)
    const folder = await this.folderService.create({
      projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
      parentId:
        body.parentId === null || typeof body.parentId === 'string' ? body.parentId : undefined,
      name: typeof body.name === 'string' ? body.name : undefined,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
    })
    return c.json(ResponseHelper.data(folder, 'Folder created successfully'), 201)
  }

  @Put('/endpoint-folders/:id')
  @AuthAccess()
  async update(c: Context) {
    const body = await this.readBody(c)
    const folder = await this.folderService.update(c.req.param('id')!, {
      parentId:
        body.parentId === null || typeof body.parentId === 'string' ? body.parentId : undefined,
      name: typeof body.name === 'string' ? body.name : undefined,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
    })
    return c.json(ResponseHelper.data(folder, 'Folder updated successfully'))
  }

  @Delete('/endpoint-folders/:id')
  @AuthAccess()
  async delete(c: Context) {
    const user = getUser(c)
    if (!user) throw new BadRequestError('Authentication required')
    await this.folderService.delete(c.req.param('id')!, user.sub)
    return c.json(ResponseHelper.success('Folder deleted successfully'))
  }

  private async readBody(c: Context): Promise<Record<string, unknown>> {
    try {
      return await c.req.json()
    } catch {
      throw new BadRequestError('Invalid JSON body')
    }
  }
}

export const endpointFoldersController = new EndpointFoldersController()
