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

// Neon state (app DB)
const neon = new pg.Pool({
  host: env.DB_HOST,
  port: +env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
})
const tables = ['environments', 'tags', 'security_schemes', 'component_schemas', 'endpoint_parameters', 'endpoint_request_bodies', 'endpoint_responses', 'endpoint_request_examples', 'endpoint_response_examples', 'endpoint_tags', 'endpoint_security_schemes']
for (const t of tables) {
  try {
    const r = await neon.query(`SELECT count(*)::int AS n, count(DISTINCT project_id)::int AS projs FROM ${t}`)
    console.log(`Neon ${t}: rows=${r.rows[0].n} distinct_projects=${r.rows[0].projs}`)
  } catch (e) {
    console.log(`Neon ${t}: ERROR ${e.message}`)
  }
}
const ep = await neon.query(`SELECT project_id, count(*)::int AS n FROM endpoints GROUP BY project_id ORDER BY project_id`)
console.log('Neon endpoints by project:', JSON.stringify(ep.rows))
const app = await neon.query(`SELECT * FROM "_applied_ddl" ORDER BY 1 LIMIT 20`)
console.log('_applied_ddl:', JSON.stringify(app.rows))
await neon.end()

// Supabase state
const supa = new pg.Pool({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
const se = await supa.query(`SELECT count(*)::int AS n FROM endpoints`)
console.log('Supabase endpoints rows:', se.rows[0].n)
const st = await supa.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`, ['public'])
console.log('Supabase tables:', st.rows.map((x) => x.table_name).join(', '))
await supa.end()
