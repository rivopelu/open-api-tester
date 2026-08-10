import { defineConfig } from 'drizzle-kit'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// `bun x` does not reliably forward `--env-file` vars to the drizzle-kit
// subprocess on Windows, so load the root .env here instead.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') })

const host = process.env.DB_HOST ?? 'localhost'
const port = Number(process.env.DB_PORT) || 5432
const user = process.env.DB_USER ?? 'postgres'
const password = process.env.DB_PASSWORD ?? ''
const database = process.env.DB_NAME ?? 'reel_cut'
const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false

// Build a connection URL so an empty password (local trust auth) is accepted.
const auth = `${encodeURIComponent(user)}${password ? `:${encodeURIComponent(password)}` : ''}`
const url = `postgresql://${auth}@${host}:${port}/${encodeURIComponent(database)}`

export default defineConfig({
  schema: './src/app/**/entity/*.entity.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url,
    ssl,
  },
})