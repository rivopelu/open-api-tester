import crypto from 'node:crypto'
import { Client } from 'pg'
import dotenv from 'dotenv'
import { hashSync } from 'bcryptjs'
import { generateId } from '../src/lib/string-utils'

dotenv.config({ path: new URL('../../../.env', import.meta.url), quiet: true })

const TARGET_URL = process.env.TARGET_DATABASE_URL ?? process.env.DATABASE_URL

const TABLES = [
  'projects',
  'endpoints',
  'endpoint_request_examples',
  'endpoint_response_examples',
  'endpoint_parameters',
  'endpoint_request_bodies',
  'endpoint_responses',
  'component_schemas',
  'schema_properties',
  'environments',
  'security_schemes',
  'tags',
]

async function main() {
  if (!TARGET_URL) {
    console.error('❌ TARGET_DATABASE_URL / DATABASE_URL is not set')
    process.exit(1)
  }

  const client = new Client({ connectionString: TARGET_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('🔌 Connected to', TARGET_URL.split('@').pop())

  const distinctSql = `select distinct created_by from (
     ${TABLES.map((t) => `select created_by from "${t}"`).join(' union all ')}
   ) x where created_by is not null`
  const { rows: distinctRows } = await client.query(distinctSql)

  const remap = new Map<string, string>()
  let created = 0

  for (const { created_by: value } of distinctRows) {
    const byEmail = await client.query(`select id from account where email = $1 limit 1`, [value])
    if (byEmail.rows.length) {
      remap.set(value, byEmail.rows[0].id)
      continue
    }
    const byId = await client.query(`select id from account where id = $1 limit 1`, [value])
    if (byId.rows.length) {
      remap.set(value, value)
      continue
    }

    const id = /^[0-9a-f]{16,64}$/i.test(value) ? value : generateId()
    const email = value.includes('@') ? value : `system-${id}@placeholder.local`
    const password = hashSync(crypto.randomBytes(12).toString('hex'), 10)

    await client.query(
      `insert into account (id, email, name, password, active, created_date, created_by)
       values ($1, $2, $3, $4, true, $5, null)
       on conflict (email) do nothing`,
      [id, email, value, password, Date.now()],
    )
    const res = await client.query(`select id from account where email = $1 limit 1`, [email])
    if (res.rows.length) {
      remap.set(value, res.rows[0].id)
      created += 1
      console.log(`＋ created placeholder account for "${value}" -> ${res.rows[0].id}`)
    }
  }

  if (remap.size === 0) {
    console.log('No created_by values to remap (all are already account ids)')
    await client.end()
    return
  }

  const entries: [string, string][] = []
  remap.forEach((to, from) => entries.push([from, to]))

  await client.query('begin')
  let updated = 0
  for (let i = 0; i < entries.length; i += 1) {
    const from = entries[i][0]
    const to = entries[i][1]
    if (from === to) continue
    for (let t = 0; t < TABLES.length; t += 1) {
      const r = await client.query(
        `update "${TABLES[t]}" set created_by = $1 where created_by = $2`,
        [to, from],
      )
      updated += r.rowCount || 0
    }
  }
  await client.query('commit')
  console.log(
    `✅ remapped ${updated} created_by value(s) across ${TABLES.length} tables (${created} account(s) generated)`,
  )
  await client.end()
}

main().catch((err) => {
  console.error('❌ fix-created-by failed:', err)
  process.exit(1)
})
