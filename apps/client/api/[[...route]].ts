import server from './_bundle/server.cjs'

const app = server.default ?? server

export async function fetch(request: Request): Promise<Response> {
  return app.fetch(request)
}