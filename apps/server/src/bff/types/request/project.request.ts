import { z } from 'zod'

export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1, { message: 'Project name is required' }).max(255),
})

export const UpdateProjectRequestSchema = z.object({
  name: z.string().min(1, { message: 'Project name is required' }).max(255).optional(),
})
