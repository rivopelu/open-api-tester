import { z } from 'zod'

export const SignUpRequestSchema = z.object({
  email: z.email({ message: 'Invalid email format' }),
  name: z.string().min(1, { message: 'Name is required' }).max(255),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }).max(72),
})

export const SignInRequestSchema = z.object({
  email: z.email({ message: 'Invalid email format' }),
  password: z.string().min(1, { message: 'Password is required' }),
})
