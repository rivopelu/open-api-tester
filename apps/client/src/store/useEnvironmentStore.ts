import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { environmentRepository } from '../repositories/environment.repository'

export interface ApiEnvironment {
  id: string
  name: string
  variables: Record<string, string>
}

interface EnvironmentState {
  environments: ApiEnvironment[]
  activeEnvironmentId: string | null
  selectEnvironment: (id: string | null) => void
  saveEnvironment: (environment: ApiEnvironment) => void
  deleteEnvironment: (id: string) => void
  loadEnvironments: () => Promise<void>
}

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set) => ({
      environments: [],
      activeEnvironmentId: null,
      selectEnvironment: (id) => set((state) => {
        void environmentRepository.save({ environments: state.environments, activeEnvironmentId: id })
        return { activeEnvironmentId: id }
      }),
      saveEnvironment: (environment) =>
        set((state) => {
          const environments = state.environments.some((item) => item.id === environment.id)
            ? state.environments.map((item) => (item.id === environment.id ? environment : item))
            : [...state.environments, environment]
          void environmentRepository.save({ environments, activeEnvironmentId: environment.id })
          return { environments, activeEnvironmentId: environment.id }
        }),
      deleteEnvironment: (id) =>
        set((state) => {
          const environments = state.environments.filter((item) => item.id !== id)
          const activeEnvironmentId = state.activeEnvironmentId === id ? null : state.activeEnvironmentId
          void environmentRepository.save({ environments, activeEnvironmentId })
          return { environments, activeEnvironmentId }
        }),
      loadEnvironments: async () => set(await environmentRepository.get()),
    }),
    { name: 'api-studio:environments' },
  ),
)

export function interpolateEnvironment(value: string, variables: Record<string, string>): string {
  return value.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match,
  )
}
