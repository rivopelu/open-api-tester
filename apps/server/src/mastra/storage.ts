import { PostgresStore } from '@mastra/pg'
import { Pool } from 'pg'
import { env } from '../configs/env'

// Separate pool from drizzle's (which is capped at 1 connection); connects lazily.
const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
})

export const storage = new PostgresStore({ id: 'mastra-storage', schemaName: 'mastra', pool })
