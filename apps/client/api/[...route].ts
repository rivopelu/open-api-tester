import app from '../../../apps/server/src/app'

export default async function handler(request: Request): Promise<Response> {
  return app.fetch(request)
}