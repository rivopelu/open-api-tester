import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import pg from 'pg'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const TARGET_URL = process.env.TARGET_DATABASE_URL ?? process.env.DATABASE_URL
if (!TARGET_URL) {
  console.error('❌ TARGET_DATABASE_URL / DATABASE_URL is not set')
  process.exit(1)
}

const OUT_DIR = path.join(__dirname, '..', 'exports')
fs.mkdirSync(OUT_DIR, { recursive: true })

const client = new pg.Client({ connectionString: TARGET_URL, ssl: { rejectUnauthorized: false } })
await client.connect()

const { rows } = await client.query(`
  select id, name,
         created_by,
         active,
         to_timestamp(created_date / 1000) as created_at,
         to_timestamp(updated_date / 1000) as updated_at,
         spec_data
  from projects
  order by updated_date desc nulls last
`)

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)

let idx = 0
for (const p of rows) {
  idx += 1
  const n = String(idx).padStart(2, '0')
  const file = path.join(OUT_DIR, `${n}-${slug(p.name)}.json`)
  const payload = {
    id: p.id,
    name: p.name,
    owner: p.created_by,
    active: p.active,
    createdAt: p.created_at?.toISOString() ?? null,
    updatedAt: p.updated_at?.toISOString() ?? null,
    spec: p.spec_data,
  }
  fs.writeFileSync(file, JSON.stringify(payload, null, 2))
  const bytes = JSON.stringify(p.spec_data).length
  console.log(`${n}  ${p.name}  (${bytes}B)  ->  ${path.basename(file)}`)
}

console.log(`\nExported ${rows.length} project(s) to ${OUT_DIR}`)
await client.end()