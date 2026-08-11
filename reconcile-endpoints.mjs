import { readFileSync } from 'node:fs'
const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)
const { default: pg } = await import('pg')
const pool = new pg.Pool({
  host: env.DB_HOST,
  port: +env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

// 1. add spec_data if missing (idempotent)
await pool.query(`ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS spec_data jsonb NOT NULL DEFAULT '{}'::jsonb`)
// 2. backfill description/operationId/deprecated from legacy columns
const bf = await pool.query(
  `UPDATE endpoints SET spec_data = jsonb_strip_nulls(jsonb_build_object('description', description, 'operationId', operation_id, 'deprecated', deprecated)) WHERE description IS NOT NULL OR operation_id IS NOT NULL OR deprecated = true`,
)
console.log('backfilled endpoints:', bf.rowCount)
// 3. drop legacy columns
await pool.query(`ALTER TABLE endpoints DROP COLUMN IF EXISTS description`)
await pool.query(`ALTER TABLE endpoints DROP COLUMN IF EXISTS operation_id`)
await pool.query(`ALTER TABLE endpoints DROP COLUMN IF EXISTS deprecated`)

const c = await pool.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = $2 ORDER BY ordinal_position`,
  ['endpoints', 'public'],
)
console.log('endpoints columns now:', c.rows.map((x) => x.column_name).join(', '))
await pool.end()
