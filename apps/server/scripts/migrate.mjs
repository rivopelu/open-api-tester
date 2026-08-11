import dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

dotenv.config({ path: new URL('../../../.env', import.meta.url), quiet: true })

// Connect exactly like the app (src/configs/database.config.ts): via DB_* vars.
// DATABASE_URL is a stale legacy value (old Supabase pooler) and must NOT be used,
// otherwise migrations apply to the wrong database.
const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

try {
  // Drop legacy Supabase tables that conflict with Drizzle schema
  console.log('Dropping legacy Supabase tables...')
  await pool.query('DROP TABLE IF EXISTS "workspace_invites" CASCADE')
  await pool.query('DROP TABLE IF EXISTS "project_invites" CASCADE')
  await pool.query('DROP TABLE IF EXISTS "project_members" CASCADE')
  await pool.query('DROP TABLE IF EXISTS "projects" CASCADE')
  console.log('Legacy tables dropped.')

  await migrate(drizzle(pool), { migrationsFolder: './drizzle' })
  console.log('Drizzle migrations applied successfully.')
} catch (e) {
  console.error('Migration failed:', e.message)
  if (e.cause) console.error('Cause:', e.cause.message)
  process.exit(1)
} finally {
  await pool.end()
}
