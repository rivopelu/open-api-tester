import { api, unwrap } from '../lib/api'

export const mcpRepository = {
  rotateToken: () => unwrap<{ token: string }>(api.post('/account/mcp-token')),
  revokeToken: async () => {
    await unwrap<null>(api.delete('/account/mcp-token'))
  },
}
