import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { accountController } from './bff/controllers/account.controller'
import { authController } from './bff/controllers/auth.controller'
import { endpointsController } from './bff/controllers/endpoints.controller'
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
app.use('*', secureHeaders())
app.route('/mcp', mcpApp)
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
