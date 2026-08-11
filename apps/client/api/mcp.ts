import server from './_bundle/server.cjs'

const app = server.default ?? server

export async function fetch(request: Request): Promise<Response> {
  const url = new URL(request.url)
  url.pathname = '/api/mcp'
  return app.fetch(new Request(url, request))
}
