import { api, unwrap } from '../lib/api'
import type { ApiEnvironment } from '../store/useEnvironmentStore'

export interface EnvironmentSettings { environments: ApiEnvironment[]; activeEnvironmentId: string | null }

export const environmentRepository = {
  get: () => unwrap<EnvironmentSettings>(api.get('/account/environments')),
  save: async (settings: EnvironmentSettings) => { await unwrap<null>(api.post('/account/environments', settings)) },
}
