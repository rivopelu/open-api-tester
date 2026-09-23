import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFileSync } from 'node:fs'
import app from './app'
import { env } from './configs/env'
import { renderHome } from './views/home'
import { detectLocale } from './lib/i18n'
import { logger } from './configs/logger'
import { pool } from './configs/database.config'

const logo = readFileSync(new URL('../public/logo.svg', import.meta.url))
// Assumes this process runs with cwd = apps/server, so the client build sits at ../client/dist.
const clientDistRoot = '../client/dist'
const isProduction = env.APP_ENV === 'production'

// index.html must always be revalidated so a new deploy is picked up; hashed assets can be cached.
const serveIndex = serveStatic({
  path: `${clientDistRoot}/index.html`,
  onFound: (_path, c) => {
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate')
  },
})

app.get('/favicon.ico', (_c) => {
  return new Response(logo, {
    headers: { 'Content-Type': 'image/svg+xml' },
  })
})

// Root: the built client's index.html in production, the backend status page otherwise.
app.get('/', async (c, next) => {
  if (isProduction) {
    return serveIndex(c, next)
  }
  const svg = logo.toString()
  const locale = detectLocale(c.req.header('Accept-Language'))
  return c.html(
    renderHome({ appName: env.APP_NAME, appEnv: env.APP_ENV, port: env.PORT, svg, locale }),
  )
})

// Production only: serve the rest of the built client (assets + SPA fallback) alongside the API.
if (isProduction) {
  app.use('/*', async (c, next) => {
    if (c.req.path.startsWith(env.API_PREFIX)) return next()
    return serveStatic({
      root: clientDistRoot,
      onFound: (path, c) => {
        c.header(
          'Cache-Control',
          path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
        )
      },
    })(c, next)
  })
  app.get('*', async (c, next) => {
    if (c.req.path.startsWith(env.API_PREFIX)) return next()
    return serveIndex(c, next)
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
