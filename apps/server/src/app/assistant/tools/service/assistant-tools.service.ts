import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { EndpointRepository } from '../../../endpoints/repository/endpoint.repository'
import { EndpointService } from '../../../endpoints/service/endpoint.service'
import { ProjectRepository } from '../../../projects/repository/project.repository'

const projectRepository = new ProjectRepository()
const endpointRepository = new EndpointRepository()
const endpointService = new EndpointService()

const listProjectsTool = createTool({
  id: 'list_projects',
  description: 'List all active API projects.',
  inputSchema: z.object({}),
  execute: async () => projectRepository.findActive(),
})

const getProjectTool = createTool({
  id: 'get_project',
  description: 'Read one active API project by its ID.',
  inputSchema: z.object({ projectId: z.string().min(1) }),
  execute: async (input) => projectRepository.findActiveById(input.projectId),
})

const getEndpointsByProjectTool = createTool({
  id: 'get_endpoints_by_project',
  description: 'Read and filter active endpoints in one API project.',
  inputSchema: z.object({
    projectId: z.string().min(1),
    method: z.string().optional().describe('HTTP method, for example GET or POST'),
    folderId: z.string().optional(),
    query: z.string().optional().describe('Case-insensitive path or summary search'),
    limit: z.number().int().min(1).max(200).optional(),
  }),
  execute: async (input) => endpointRepository.findByProjectFiltered(input),
})

const createEndpointTool = createTool({
  id: 'create_endpoint',
  description: 'Create an endpoint and optionally its complete OpenAPI contract.',
  inputSchema: z.object({
    projectId: z.string().min(1),
    folderId: z.string().nullable().optional(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'TRACE']),
    path: z.string().min(1),
    summary: z.string().optional(),
    specData: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('OpenAPI operation fields: parameters, requestBody, responses, tags, security, description, operationId.'),
  }),
  execute: async (input) => endpointService.create(input),
})

export const assistantTools = {
  list_projects: listProjectsTool,
  get_project: getProjectTool,
  get_endpoints_by_project: getEndpointsByProjectTool,
  create_endpoint: createEndpointTool,
}
