import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set.');
  process.exit(1);
}

const { Client } = pg;
const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('🔄 Connecting to database...');
  try {
    await client.connect();
    console.log('✅ Connected successfully.');

    const sqlFilePath = path.join(rootDir, 'supabase/migrations/002_workspace_invites.sql');
    console.log(`📄 Reading migration file: ${sqlFilePath}`);
    
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('🚀 Executing SQL migration...');
    await client.query(sql);

    console.log('🚀 Reloading PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");

    console.log('🎉 Migration applied and schema cache reloaded successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Disconnected from database.');
  }
}

runMigration();
