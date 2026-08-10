import app from './_bundle/server.mjs'

export default async function handler(request: Request): Promise<Response> {
  return app.fetch(request)
}