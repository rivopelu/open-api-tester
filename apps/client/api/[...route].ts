import server from './_bundle/server.cjs'

const app = server.default ?? server

export default async function handler(request: Request): Promise<Response> {
  return app.fetch(request)
}