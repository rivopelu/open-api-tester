import { serve } from '@hono/node-server'
import { serveStatic } from 'hono/bun'
import { readFileSync } from 'node:fs'
import app from './app'
import { env } from './configs/env'
import { renderHome } from './views/home'
import { detectLocale } from './lib/i18n'
import { logger } from './configs/logger'
import { pool } from './configs/database.config'

const logo = readFileSync(new URL('../public/logo.svg', import.meta.url))

app.get('/favicon.ico', (_c) => {
  return new Response(logo, {
    headers: { 'Content-Type': 'image/svg+xml' },
  })
})

app.get('/', async (c) => {
  const svg = logo.toString()
  const locale = detectLocale(c.req.header('Accept-Language'))
  return c.html(
    renderHome({ appName: env.APP_NAME, appEnv: env.APP_ENV, port: env.PORT, svg, locale }),
  )
})

// Production only: serve the built client (apps/client/dist) alongside the API.
// Assumes this process runs with cwd = apps/server, so the client build sits at ../client/dist.
if (env.APP_ENV === 'production') {
  const clientDistRoot = '../client/dist'
  app.use('/*', async (c, next) => {
    if (c.req.path.startsWith(env.API_PREFIX) || c.req.path === '/' || c.req.path === '/favicon.ico') {
      return next()
    }
    return serveStatic({ root: clientDistRoot })(c, next)
  })
  app.get('*', async (c, next) => {
    if (c.req.path.startsWith(env.API_PREFIX)) return next()
    return serveStatic({ path: `${clientDistRoot}/index.html` })(c, next)
  })
}

const server = serve({
  fetch: app.fetch,
  port: env.PORT,
})

logger.info(`Server started: http://localhost:${env.PORT}`)

async function shutdown(signal: string) {
  logger.info(`${signal} received - shutting down`)
  server.close()
  await pool.end()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
