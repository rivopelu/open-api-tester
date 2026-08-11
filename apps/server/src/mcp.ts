import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { Hono } from 'hono'
import { z } from 'zod'
import { AccountService } from './app/account/service/account.service'
import { EndpointRepository } from './app/endpoints/repository/endpoint.repository'
import { EndpointService } from './app/endpoints/service/endpoint.service'
import { ProjectRepository } from './app/projects/repository/project.repository'
import { ProjectService } from './app/projects/service/project.service'
import { EndpointFolderService } from './app/endpoint-folders/service/endpoint-folder.service'
import type { EndpointExample, RequestBodyDefinition, ResponseDefinition } from '@modern-api-studio/types'
import { randomUUID } from 'node:crypto'

const accountService = new AccountService()
const projectRepository = new ProjectRepository()
const endpointRepository = new EndpointRepository()
const endpointService = new EndpointService()
const projectService = new ProjectService()
const folderService = new EndpointFolderService()
const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] })

function createMcpServer(accountId: string) {
  const server = new McpServer({ name: 'modern-api-studio', version: '1.0.0' })

  server.registerTool(
    'list_projects',
    {
      description: 'List all active API projects.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => json(await projectRepository.findActive()),
  )

  server.registerTool(
    'create_project',
    {
      description: 'Create a global API project.',
      inputSchema: { name: z.string().trim().min(1) },
    },
    async ({ name }) => json(await projectService.create({ name, created_by: accountId })),
  )

  server.registerTool(
    'create_folder',
    {
      description: 'Create a folder inside an API project.',
      inputSchema: {
        projectId: z.string().min(1),
        name: z.string().trim().min(1),
        parentId: z.string().nullable().optional(),
      },
    },
    async (input) => json(await folderService.create(input)),
  )

  server.registerTool(
    'create_endpoint',
    {
      description: 'Create an endpoint and optionally its complete OpenAPI contract.',
      inputSchema: {
        projectId: z.string().min(1),
        folderId: z.string().nullable().optional(),
        method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'TRACE']),
        path: z.string().min(1),
        summary: z.string().optional(),
        specData: z.record(z.string(), z.unknown()).optional().describe('OpenAPI operation fields: parameters, requestBody, responses, tags, security, description, operationId.'),
      },
    },
    async (input) => json(await endpointService.create(input)),
  )

  server.registerTool(
    'update_endpoint_contract',
    {
      description: 'Update endpoint method, path, summary, folder, or merge OpenAPI operation fields into its contract.',
      inputSchema: {
        endpointId: z.string().min(1),
        folderId: z.string().nullable().optional(),
        method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'TRACE']).optional(),
        path: z.string().min(1).optional(),
        summary: z.string().optional(),
        specData: z.record(z.string(), z.unknown()).optional(),
      },
    },
    async ({ endpointId, specData, ...changes }) => {
      const current = await endpointService.get(endpointId)
      return json(await endpointService.update(endpointId, {
        ...changes,
        ...(specData ? { specData: { ...current.specData, ...specData } } : {}),
      }))
    },
  )

  server.registerTool(
    'create_example',
    {
      description: 'Add a JSON example to an endpoint request body or one response status.',
      inputSchema: {
        endpointId: z.string().min(1),
        scope: z.enum(['request', 'response']),
        responseStatus: z.string().optional().describe('Required for response examples, for example 200 or 404.'),
        name: z.string().trim().min(1),
        summary: z.string().optional(),
        value: z.unknown().describe('JSON value. It will be stored as formatted JSON text.'),
      },
    },
    async ({ endpointId, scope, responseStatus, name, summary, value }) => {
      const endpoint = await endpointService.get(endpointId)
      const spec = endpoint.specData
      const example: EndpointExample = { id: randomUUID(), name, summary, value: JSON.stringify(value, null, 2) }
      const requestBody = spec.requestBody as RequestBodyDefinition | undefined
      const responses = Array.isArray(spec.responses) ? spec.responses as ResponseDefinition[] : []

      if (scope === 'request') {
        return json(await endpointService.updateExamples(endpointId, {
          requestBody: {
            required: requestBody?.required ?? false,
            contentType: requestBody?.contentType ?? 'application/json',
            schema: requestBody?.schema ?? [],
            ...requestBody,
            examples: [...(requestBody?.examples ?? []), example],
          },
          responses,
        }))
      }
      if (!responseStatus) throw new Error('responseStatus is required for response examples')
      const response = responses.find((item) => item.statusCode === responseStatus)
      const nextResponses = response
        ? responses.map((item) => item.id === response.id ? { ...item, examples: [...(item.examples ?? []), example] } : item)
        : [...responses, { id: randomUUID(), statusCode: responseStatus, description: 'Generated response', contentType: 'application/json', examples: [example] }]
      return json(await endpointService.updateExamples(endpointId, { requestBody, responses: nextResponses }))
    },
  )

  server.registerTool(
    'get_project',
    {
      description: 'Read one active API project by its ID.',
      inputSchema: { projectId: z.string().min(1) },
      annotations: { readOnlyHint: true },
    },
    async ({ projectId }) => json(await projectRepository.findActiveById(projectId)),
  )

  server.registerTool(
    'get_endpoints_by_project',
    {
      description: 'Read and filter active endpoints in one API project.',
      inputSchema: {
        projectId: z.string().min(1),
        method: z.string().optional().describe('HTTP method, for example GET or POST'),
        folderId: z.string().optional(),
        query: z.string().optional().describe('Case-insensitive path or summary search'),
        limit: z.number().int().min(1).max(200).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (input) => json(await endpointRepository.findByProjectFiltered(input)),
  )

  return server
}

export const mcpApp = new Hono()

mcpApp.all('/', async (c) => {
  const authorization = c.req.header('Authorization')
  const account = authorization?.startsWith('Bearer ')
    ? await accountService.authenticateMcpToken(authorization.slice(7))
    : null
  if (!account) {
    return c.json({ error: 'Invalid MCP token' }, 401)
  }

  const transport = new WebStandardStreamableHTTPServerTransport()
  await createMcpServer(account.id).connect(transport)
  return transport.handleRequest(c.req.raw)
})
