// One-time importer: reseeds the fresh (migrated) Neon DB from exports/.
// Reads account export (acconut.json) + project exports (0X-*.json, old Mongo-era
// shape: top-level id/name/owner/active/createdAt/updatedAt + `spec` full OpenAPI),
// and writes them into the new 3-table model: account, projects, endpoints(spec_data).
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'
import { randomUUID } from 'node:crypto'

const root = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8')
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

const j = (n) => JSON.stringify(n)

async function autocommit(client, sql, params) {
  await client.query(sql, params)
}

const db = await pool.connect()
try {
  // ── 1. accounts ─────────────────────────────────────────────────────────────
  const accounts = JSON.parse(readFileSync(join(root, 'exports', 'acconut.json'), 'utf8'))
  if (!Array.isArray(accounts)) throw new Error('acconut.json is not an array')

  const idLayer = new Map() // account.id -> account
  const emailLayer = new Map() // account.email -> account
  for (const a of accounts) {
    idLayer.set(a.id, a)
    if (a.email) emailLayer.set(a.email.toLowerCase(), a)
    await autocommit(
      db,
      `INSERT INTO account
        (id, email, name, password, profile_picture, active, created_date, created_by, updated_date, updated_by, deleted_date, deleted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO NOTHING`,
      [a.id, a.email, a.name, a.password, a.profile_picture, a.active, a.created_date, a.created_by, a.updated_date, a.updated_by, a.deleted_date, a.deleted_by],
    )
  }
  console.log(`imported ${accounts.length} accounts`)

  const mapOwner = (owner) => {
    if (!owner) return null
    if (idLayer.has(owner)) return owner
    const byEmail = emailLayer.get(String(owner).toLowerCase())
    return byEmail ? byEmail.id : null
  }

  // ── 2. projects + endpoints ─────────────────────────────────────────────────
  const projectFiles = readdirSync(join(root, 'exports'))
    .filter((f) => /^\d{2}-.*\.json$/.test(f))
    .sort()

  for (const file of projectFiles) {
    const p = JSON.parse(readFileSync(join(root, 'exports', file), 'utf8'))
    if (!p || typeof p !== 'object' || !p.id) {
      console.warn('SKIP', file, 'no id')
      continue
    }
    const spec = p.spec && typeof p.spec === 'object' ? p.spec : {}
    const createdBy = mapOwner(p.owner)
    const createdDate = p.createdAt ? new Date(p.createdAt).getTime() : Date.now()
    const updatedDate = p.updatedAt ? new Date(p.updatedAt).getTime() : null

    await autocommit(
      db,
      `INSERT INTO projects
        (id, name, description, version, openapi_version, global_security, active, created_date, created_by, updated_date, updated_by, deleted_date, deleted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO NOTHING`,
      [
        p.id,
        p.name ?? 'Untitled Project',
        spec.info?.description ?? null,
        spec.info?.version ?? '1.0.0',
        spec.openApiVersion === 'swagger2' ? 'swagger2' : 'openapi3',
        JSON.stringify(spec.globalSecurity ?? []),
        p.active ?? true,
        createdDate,
        createdBy,
        updatedDate,
        createdBy,
        null,
        null,
      ],
    )

    const endpoints = Array.isArray(spec.endpoints) ? spec.endpoints : []
    let epCount = 0
    if (endpoints.length) {
      for (let i = 0; i < endpoints.length; i += 1) {
        const ep = endpoints[i]
        let epId = ep.id
        if (!epId || epId.length > 255) epId = randomUUID()
        // spec_data = the full endpoint definition (client reads
        // specData.parameters/requestBody/responses/description/operationId/deprecated/tags/security)
        await autocommit(
          db,
          `INSERT INTO endpoints
            (id, project_id, path, method, summary, sort_order, spec_data, active, created_date, created_by, updated_date, updated_by, deleted_date, deleted_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
           ON CONFLICT (id) DO NOTHING`,
          [
            epId,
            p.id,
            ep.path ?? '/',
            String(ep.method ?? 'GET').toUpperCase(),
            ep.summary ?? '',
            i,
            JSON.stringify(ep),
            true,
            createdDate,
            createdBy,
            null,
            null,
            null,
            null,
          ],
        )
        epCount += 1
      }
    }
    console.log(`imported project ${basename(file)} -> ${p.id} (${p.name}) active=${p.active ?? true} endpoints=${epCount} ownerBy=${createdBy}`)
  }
} finally {
  db.release()
  await pool.end()
}
console.log('DONE')