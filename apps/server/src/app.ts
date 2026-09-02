import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { accountController } from './bff/controllers/account.controller'
import { authController } from './bff/controllers/auth.controller'
import { endpointsController } from './bff/controllers/endpoints.controller'
import { createMockApp } from './bff/controllers/mock.controller'
import { endpointFoldersController } from './bff/controllers/endpoint-folders.controller'
import { projectsController } from './bff/controllers/projects.controller'
import { systemController } from './bff/controllers/system.controller'
import { corsConfig } from './configs/cors'
import { env } from './configs/env'
import { errorHandler } from './configs/error-handler'
import { registerControllers } from './lib/decorators'
import { requestLogger } from './middlewares/request-logger'
import { mcpApp } from './mcp'

const app = new Hono()

app.use('*', cors(corsConfig))
app.use('*', requestLogger())
// crossOriginResourcePolicy defaults to 'same-origin', which blocks link-preview
// crawlers (OG image, Discord/Slack/WhatsApp embeds) and third-party sites from
// loading public assets like the client bundle and og.png.
app.use('*', secureHeaders({ crossOriginResourcePolicy: 'cross-origin' }))
app.route(`${env.API_PREFIX}/mcp`, mcpApp)
// Public mock server: serves stored response examples, no auth.
app.route(`${env.API_PREFIX}/mock`, createMockApp())
registerControllers(
  app,
  [
    systemController,
    authController,
    accountController,
    projectsController,
    endpointFoldersController,
    endpointsController,
  ],
  env.API_PREFIX,
)
app.onError(errorHandler)

export default app
