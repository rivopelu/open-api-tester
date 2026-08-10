import { authAccessMiddleware } from '../middlewares/auth-access'

export type Constructor = new (...args: unknown[]) => object
type Handler = (...args: unknown[]) => unknown

interface RouteEntry {
  method: string
  path: string
  handler: Handler
  authRequired?: boolean
}

interface ControllerEntry {
  basePath: string
  routes: RouteEntry[]
  authRequired?: boolean
}

const registry = new Map<Constructor, ControllerEntry>()

// Track method-level @AuthAccess() via WeakSet of handler functions.
// Since method decorators are applied bottom-up, @AuthAccess() runs before
// @Get/@Post, but both receive the same descriptor.value reference.
const authRequiredHandlers = new WeakSet<Handler>()

export function markRouteAuth(handler: Handler) {
  authRequiredHandlers.add(handler)
}

export function setControllerAuth(target: Constructor) {
  let entry = registry.get(target)
  if (!entry) {
    entry = { basePath: '', routes: [], authRequired: true }
    registry.set(target, entry)
    return
  }
  entry.authRequired = true
  for (const route of entry.routes) {
    route.authRequired = true
  }
}

export function registerRoute(target: Constructor, method: string, path: string, handler: Handler) {
  let entry = registry.get(target)
  if (!entry) {
    entry = { basePath: '', routes: [] }
    registry.set(target, entry)
  }

  const authRequired = authRequiredHandlers.has(handler)
  entry.routes.push({ method, path, handler, authRequired })
}

export function setBasePath(target: Constructor, basePath: string) {
  let entry = registry.get(target)
  if (!entry) {
    entry = { basePath, routes: [] }
    registry.set(target, entry)
  } else {
    entry.basePath = basePath
  }
}

export function registerControllers(app: any, controllers: object[], globalPrefix?: string) {
  const authMw = authAccessMiddleware()

  for (const controller of controllers) {
    const entry = registry.get(controller.constructor as Constructor)
    if (!entry) continue

    const base = [globalPrefix, entry.basePath].filter(Boolean).join('').replace(/\/$/, '')
    for (const route of entry.routes) {
      const path = `${base}${route.path}`
      const handler = route.handler.bind(controller)

      if (entry.authRequired || route.authRequired) {
        app[route.method.toLowerCase()](path, authMw, handler)
      } else {
        app[route.method.toLowerCase()](path, handler)
      }
    }
  }
}
