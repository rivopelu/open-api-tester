import { defineConfig } from 'drizzle-kit'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const host = process.env.DB_HOST ?? 'localhost'
const port = Number(process.env.DB_PORT) || 5432
const user = process.env.DB_USER ?? 'postgres'
const password = process.env.DB_PASSWORD ?? ''
const database = process.env.DB_NAME ?? 'modern_api_studio'
const auth = `${encodeURIComponent(user)}${password ? `:${encodeURIComponent(password)}` : ''}`
const url = `postgresql://${auth}@${host}:${port}/${encodeURIComponent(database)}`

const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false

export default defineConfig({
  schema: './src/app/**/entity/*.entity.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url,
    ssl,
  },
})
