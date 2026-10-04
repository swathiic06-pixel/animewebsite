import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const { Client } = pg

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function runMigration(dbPassword) {
  const password = dbPassword || process.env.SUPABASE_DB_PASSWORD || process.argv[2]
  if (!password) {
    console.error('❌ Error: Supabase database password is required.')
    console.error('Usage: node scripts/run_supabase_migration.js <your_db_password>')
    process.exit(1)
  }

  const host = 'aws-0-ap-northeast-2.pooler.supabase.com'
  const user = 'postgres.efkozxciddghlkfwxsfm'
  const port = 6543
  const database = 'postgres'

  console.log(`Connecting to Supabase (${host}:6543) as ${user}...`)

  const client = new Client({
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✓ Successfully connected to Supabase PostgreSQL database!')

    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261002_fix_rls_and_cleanup_data.sql')
    console.log(`Reading SQL from: ${sqlPath}`)
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')

    console.log('Executing migration script...')
    await client.query(sqlContent)

    console.log('\n🎉 SUCCESS! All tables, columns, RLS policies, and realtime publications have been updated on Supabase!')
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigration()
