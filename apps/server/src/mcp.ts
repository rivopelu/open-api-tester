import type { HttpBindings } from '@hono/node-server'
import { RESPONSE_ALREADY_SENT } from '@hono/node-server/utils/response'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { Hono } from 'hono'
import { AccountService } from './app/account/service/account.service'
import { mcpServer } from './mastra/mcp'

const accountService = new AccountService()

export const mcpApp = new Hono<{ Bindings: HttpBindings }>()

mcpApp.all('/', async (c) => {
  const authorization = c.req.header('Authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined
  const account = token ? await accountService.authenticateMcpToken(token) : null
  if (!account || !token) {
    return c.json({ error: 'Invalid MCP token' }, 401)
  }

  const { incoming, outgoing } = c.env
  // The SDK transport forwards `req.auth` to tools as `authInfo`.
  ;(incoming as typeof incoming & { auth?: AuthInfo }).auth = {
    token,
    clientId: account.id,
    scopes: [],
    extra: { accountId: account.id },
  }

  const url = new URL(c.req.url)
  await mcpServer.startHTTP({
    url,
    httpPath: url.pathname,
    req: incoming,
    res: outgoing,
    options: { serverless: true },
  })
  return RESPONSE_ALREADY_SENT
})
