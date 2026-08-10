import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env } from './env'

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  min: 0,
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
})

export const db = drizzle({ client: pool })
