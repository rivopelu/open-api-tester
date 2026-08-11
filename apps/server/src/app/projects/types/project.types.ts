export interface CreateProjectInput {
  name: string
  created_by: string
}

export interface UpdateProjectInput {
  name?: string
}

export interface ProjectItem {
  id: string
  name: string
  description: string | null
  version: string | null
  createdAt: string
  updatedAt: string | null
  createdById?: string | null
  creator?: {
    name: string
    email: string
    profilePicture: string | null
  } | null
}
