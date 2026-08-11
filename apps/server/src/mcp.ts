import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { Hono } from 'hono'
import { z } from 'zod'
import { AccountService } from './app/account/service/account.service'
import { EndpointRepository } from './app/endpoints/repository/endpoint.repository'
import { ProjectRepository } from './app/projects/repository/project.repository'

const accountService = new AccountService()
const projectRepository = new ProjectRepository()
const endpointRepository = new EndpointRepository()
const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] })

function createMcpServer() {
  const server = new McpServer({ name: 'modern-api-studio', version: '1.0.0' })

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
  if (!authorization?.startsWith('Bearer ') || !(await accountService.authenticateMcpToken(authorization.slice(7)))) {
    return c.json({ error: 'Invalid MCP token' }, 401)
  }

  const transport = new WebStandardStreamableHTTPServerTransport()
  await createMcpServer().connect(transport)
  return transport.handleRequest(c.req.raw)
})
