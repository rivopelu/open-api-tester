import { api, unwrap } from '../lib/api'

export const mcpRepository = {
  getToken: () => unwrap<{ token: string | null }>(api.get('/account/mcp-token')),
  rotateToken: () => unwrap<{ token: string }>(api.post('/account/mcp-token')),
  revokeToken: async () => {
    await unwrap<null>(api.delete('/account/mcp-token'))
  },
}
