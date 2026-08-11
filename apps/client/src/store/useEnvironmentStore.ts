import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
}

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set) => ({
      environments: [],
      activeEnvironmentId: null,
      selectEnvironment: (id) => set({ activeEnvironmentId: id }),
      saveEnvironment: (environment) =>
        set((state) => ({
          environments: state.environments.some((item) => item.id === environment.id)
            ? state.environments.map((item) => (item.id === environment.id ? environment : item))
            : [...state.environments, environment],
          activeEnvironmentId: environment.id,
        })),
      deleteEnvironment: (id) =>
        set((state) => ({
          environments: state.environments.filter((item) => item.id !== id),
          activeEnvironmentId: state.activeEnvironmentId === id ? null : state.activeEnvironmentId,
        })),
    }),
    { name: 'api-studio:environments' },
  ),
)

export function interpolateEnvironment(value: string, variables: Record<string, string>): string {
  return value.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match,
  )
}
