import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { Hono } from 'hono'
import { AccountService } from './app/account/service/account.service'
import { domainTools } from './app/assistant/tools/definitions/domain-tools'

const accountService = new AccountService()
const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] })

export function createMcpServer(accountId: string) {
  const server = new McpServer({ name: 'modern-api-studio', version: '1.0.0' })

  for (const toolDef of domainTools) {
    server.registerTool(
      toolDef.name,
      {
        description: toolDef.description,
        inputSchema: toolDef.inputSchema.shape,
        annotations: {
          readOnlyHint: toolDef.readOnly,
          destructiveHint: toolDef.destructive,
        },
      },
      async (args) => {
        const result = await toolDef.execute(args, { accountId })
        return json(result)
      },
    )
  }

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
