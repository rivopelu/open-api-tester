import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

// Support running from root or scripts dir
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

// ─────────────────────────────────────────────────────────────────────────────
// One-shot data migration:  Supabase (old client-side source of truth)  →  the
// new Bun + Drizzle backend Postgres.
//
// What it moves:
//   • auth.users  →  account      (bcrypt password hashes carry over untouched,
//                                  so users keep their existing passwords)
//   • public.projects  →  projects (only those owned by a migrated account)
//
// It is idempotent (upsert on primary key), so it can be re-run safely.
//
// Env / flags:
//   SUPABASE_DATABASE_URL   source Postgres (postgres role bypasses RLS/PostgREST)
//   DATABASE_URL            target Postgres (backend). Override with
//                           TARGET_DATABASE_URL if the source is ALSO the value
//                           of DATABASE_URL.
//   --dry-run               validate + count without writing anything
//   --limit N               process at most N accounts and N projects
// ─────────────────────────────────────────────────────────────────────────────

const SOURCE_URL = process.env.SUPABASE_DATABASE_URL;
const TARGET_URL = process.env.TARGET_DATABASE_URL ?? process.env.DATABASE_URL;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? Number(args[limitIdx + 1]) || 0 : 0;

if (!SOURCE_URL) {
  console.error('❌ SUPABASE_DATABASE_URL is not set.');
  console.error('Point it at the OLD Supabase project Postgres (postgres role):');
  console.error('  postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres');
  process.exit(1);
}
if (!TARGET_URL) {
  console.error('❌ DATABASE_URL is not set (target backend Postgres).');
  process.exit(1);
}

const SSL = { rejectUnauthorized: false };
const count = {
  accountsInserted: 0,
  accountsUpdated: 0,
  accountsSkipped: 0,
  projectsInserted: 0,
  projectsUpdated: 0,
  projectsSkippedNoOwner: 0,
};

function tsToMs(value) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

async function main() {
  const src = new pg.Client({ connectionString: SOURCE_URL, ssl: SSL });
  const tgt = new pg.Client({ connectionString: TARGET_URL, ssl: SSL });

  console.log(`🔌 Connecting to source (${SOURCE_URL.split('@').pop()})`);
  await src.connect();
  console.log(`🔌 Connecting to target (${TARGET_URL.split('@').pop()})`);
  await tgt.connect();
  if (DRY_RUN) console.log('🧪 DRY RUN — no rows will be written.\n');

  // ── Accounts: auth.users → account ────────────────────────────────────────
  const { rows: existingRows } = await tgt.query('select id, email from account');
  const existingEmails = new Set(existingRows.map((r) => r.email));
  const existingIds = new Set(existingRows.map((r) => r.id));
  const migratedUserIds = new Map(); // supabase user id → email (for projects)

  const { rows: users } = await src.query(
    `select id::text as id, email, encrypted_password, raw_user_meta_data, created_at
       from auth.users
      order by created_at`,
  );

  const userList = users.filter((u) => u.email).slice(0, LIMIT || undefined);
  console.log(`👥 Migrating ${userList.length} account(s)...`);

  for (const u of userList) {
    const name =
      u.raw_user_meta_data?.name ??
      u.raw_user_meta_data?.full_name ??
      u.email.split('@')[0];
    const encrypted = u.encrypted_password ?? '';
    const password = encrypted.startsWith('$2') ? encrypted : null;
    const profilePicture = u.raw_user_meta_data?.avatar_url ?? null;
    const createdMs = tsToMs(u.created_at) ?? Date.now();

    migratedUserIds.set(u.id, u.email);

    if (existingEmails.has(u.email) && !existingIds.has(u.id)) {
      console.log(`  ⏭  ${u.email} — already exists in target (different id), skipped`);
      count.accountsSkipped += 1;
      continue;
    }

    if (DRY_RUN) {
      count.accountsInserted += existingIds.has(u.id) ? 0 : 1;
      count.accountsUpdated += existingIds.has(u.id) ? 1 : 0;
      console.log(
        `  ${existingIds.has(u.id) ? '↻ update' : '＋ insert'}  ${u.email}  (password ${password ? 'kept as bcrypt' : 'NOT RECOVERABLE'})`,
      );
      continue;
    }

    try {
      const res = await tgt.query(
        `insert into account (id, email, name, password, profile_picture, active, created_date, created_by)
         values ($1, $2, $3, $4, $5, true, $6, $7)
         on conflict (id) do update set
           email = excluded.email,
           name = excluded.name,
           password = excluded.password,
           profile_picture = excluded.profile_picture,
           updated_date = excluded.updated_date`,
        [u.id, u.email, name, password, profilePicture, createdMs, u.email],
      );
      if (existingIds.has(u.id) || res.rowCount === 0) {
        count.accountsUpdated += 1;
      } else {
        count.accountsInserted += 1;
      }
    } catch (err) {
      console.error(`  ✖ ${u.email} — ${err.message}`);
      count.accountsSkipped += 1;
    }
  }

  // ── Projects: public.projects → projects ──────────────────────────────────
  const prevProjectIds = new Set(
    (await tgt.query('select id from projects')).rows.map((r) => r.id),
  );
  const { rows: projects } = await src.query(
    `select id::text as id, user_id::text as user_id, name, spec_data,
            created_at, updated_at
       from public.projects
      order by updated_at desc nulls last`,
  );

  const projectList = projects.slice(0, LIMIT || undefined);
  console.log(`📦 Migrating ${projectList.length} project(s)...`);

  for (const p of projectList) {
    const ownerEmail = migratedUserIds.get(p.user_id);
    if (!ownerEmail) {
      console.log(`  ⏭  project ${p.id} — owner not migrated, skipped`);
      count.projectsSkippedNoOwner += 1;
      continue;
    }

    if (DRY_RUN) {
      count.projectsInserted += prevProjectIds.has(p.id) ? 0 : 1;
      count.projectsUpdated += prevProjectIds.has(p.id) ? 1 : 0;
      console.log(`  ${prevProjectIds.has(p.id) ? '↻ update' : '＋ insert'}  "${p.name}"  (owned by ${ownerEmail})`);
      continue;
    }

    try {
      await tgt.query(
        `insert into projects (id, name, spec_data, active, created_date, created_by, updated_date)
         values ($1, $2, $3, true, $4, $5, $6)
         on conflict (id) do update set
           name = excluded.name,
           spec_data = excluded.spec_data,
           active = true,
           updated_date = excluded.updated_date,
           updated_by = excluded.updated_by`,
        [
          p.id,
          p.name,
          p.spec_data ?? {},
          tsToMs(p.created_at) ?? Date.now(),
          ownerEmail,
          tsToMs(p.updated_at) ?? tsToMs(p.created_at) ?? Date.now(),
        ],
      );
      if (prevProjectIds.has(p.id)) count.projectsUpdated += 1;
      else count.projectsInserted += 1;
    } catch (err) {
      console.error(`  ✖ project ${p.id} ("${p.name}") — ${err.message}`);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n────────────────────────────────────────────────');
  console.log('Summary:');
  console.log(`  Accounts : ${count.accountsInserted} inserted · ${count.accountsUpdated} updated · ${count.accountsSkipped} skipped`);
  console.log(`  Projects : ${count.projectsInserted} inserted · ${count.projectsUpdated} updated · ${count.projectsSkippedNoOwner} skipped (no owner)`);
  if (DRY_RUN) {
    console.log('\n🧪 DRY RUN complete — nothing was written.');
  } else {
    console.log('\n✅ Migration complete.');
    console.log('Note: accounts whose Supabase bcrypt hash carried over can log in with their existing password.');
  }

  await tgt.end();
  await src.end();
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});