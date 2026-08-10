export interface CreateProjectInput {
  name: string
  spec_data?: Record<string, unknown>
  created_by: string
}

export interface UpdateProjectInput {
  name?: string
  spec_data?: Record<string, unknown>
}

export interface ProjectItem {
  id: string
  name: string
  specData: Record<string, unknown>
  createdAt: string
  updatedAt: string | null
}