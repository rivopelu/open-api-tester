import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../../.env'), quiet: true })

const TARGET_URL = process.env.TARGET_DATABASE_URL ?? process.env.DATABASE_URL
if (!TARGET_URL) {
  console.error('❌ TARGET_DATABASE_URL / DATABASE_URL is not set')
  process.exit(1)
}

const client = new Client({ connectionString: TARGET_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
console.log('🔌 Connected to', TARGET_URL.split('@').pop())

// Track applied drizzle files so DDL is idempotent across runs.
await client.query(`create table if not exists public._applied_ddl (
  id bigserial primary key,
  file text not null unique,
  applied_at timestamptz not null default now()
)`)

// Preseed files that were already applied manually before this marker existed.
const { rows: endpoints } = await client.query(`select to_regclass('public.endpoints') as t`)
const { rows: accounts } = await client.query(`select to_regclass('public.account') as t`)
const { rows: projects } = await client.query(
  `select column_name from information_schema.columns where table_name = 'projects' and column_name = 'description'`,
)
const preApplied = new Set()
if (accounts[0].t) preApplied.add('0000_whole_jasper_sitwell.sql')
if (endpoints[0].t) preApplied.add('0001_yielding_madame_masque.sql')
if (projects.length > 0) preApplied.add('0002_loving_nekra.sql')

for (const f of preApplied) {
  await client.query(`insert into public._applied_ddl (file) values ($1) on conflict (file) do nothing`, [f])
}

const drizzleDir = path.join(__dirname, '../drizzle')
const { rows: marked } = await client.query(`select file from public._applied_ddl`)
const applied = new Set(marked.map((m) => m.file))

const files = fs
  .readdirSync(drizzleDir)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f))
  .sort()

for (const f of files) {
  if (applied.has(f)) {
    console.log('⏭  already applied:', f)
    continue
  }
  const raw = fs.readFileSync(path.join(drizzleDir, f), 'utf8')
  const sql = raw.replace(/\s*--> statement-breakpoint\s*/g, '\n')
  try {
    await client.query('begin')
    await client.query(sql)
    await client.query(`insert into public._applied_ddl (file) values ($1)`, [f])
    await client.query('commit')
    console.log('✅ applied', f)
  } catch (err) {
    await client.query('rollback')
    console.error('✖ failed', f, '-', err.message)
    process.exitCode = 1
    break
  }
}

await client.end()
console.log('🔌 done')