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

const ARGS = new Set(process.argv.slice(2))
const DRY = ARGS.has('--dry-run')
const FILES = ARGS.has('--data-only')
  ? []
  : ['0001_yielding_madame_masque.sql', '0002_loving_nekra.sql']

const client = new Client({ connectionString: TARGET_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
console.log('🔌 Connected to', TARGET_URL.split('@').pop())

const { rows } = await client.query(`select to_regclass('public.endpoints') as t`)
const endpointsExist = !!rows[0].t

if (FILES.length === 0) {
  console.log('--data-only: skipping DDL')
} else if (endpointsExist) {
  console.log('⏭ DDL already applied (public.endpoints exists)')
} else {
  for (const f of FILES) {
    const file = path.join(__dirname, '../drizzle', f)
    if (!fs.existsSync(file)) {
      console.error(`✖ missing migration file: ${f}`)
      process.exit(1)
    }
    const raw = fs.readFileSync(file, 'utf8')
    const sql = raw.replace(/\s*--> statement-breakpoint\s*/g, '\n')
    if (DRY) {
      console.log(`(dry-run) would apply ${f} (${sql.length} chars)`)
      continue
    }
    await client.query(sql)
    console.log('✅ applied', f)
  }
}

await client.end()
console.log(DRY ? '🧪 DDL dry-run complete' : '🔌 done')