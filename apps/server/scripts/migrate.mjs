import { copyFileSync, existsSync, unlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import process from 'node:process'
import dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

const serverDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rootEnvPath = path.resolve(serverDirectory, '../../.env')
const serverEnvPath = path.resolve(serverDirectory, '.env')
const migrationsDirectory = path.resolve(serverDirectory, 'drizzle')
const logError = (...args) => process.stderr.write(`${args.join(' ')}\n`)

if (!existsSync(rootEnvPath)) {
  logError(`Root environment file not found: ${rootEnvPath}`)
  process.exit(1)
}

if (existsSync(serverEnvPath)) {
  logError(`Temporary environment file already exists: ${serverEnvPath}`)
  logError('Remove it manually before running the migration.')
  process.exit(1)
}

let pool
let exitCode = 1

try {
  copyFileSync(rootEnvPath, serverEnvPath)
  dotenv.config({ path: serverEnvPath, override: true, quiet: true })

  pool = new pg.Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  })

  await migrate(drizzle(pool), { migrationsFolder: migrationsDirectory })
  process.stdout.write('Drizzle migrations applied successfully.\n')
  exitCode = 0
} catch (error) {
  logError('Migration failed:', error instanceof Error ? error.message : error)
  if (error instanceof Error && error.cause instanceof Error) {
    logError('Cause:', error.cause.message)
  }
} finally {
  if (pool) await pool.end()
  if (existsSync(serverEnvPath)) unlinkSync(serverEnvPath)
}

process.exit(exitCode)
