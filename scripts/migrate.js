#!/usr/bin/env node

/**
 * Supabase Migration Runner
 *
 * 用法:
 *   node scripts/migrate.js                    # 运行所有未执行的 migration
 *   node scripts/migrate.js 004               # 只运行指定编号的 migration
 *   node scripts/migrate.js --status           # 查看已执行的 migration
 *   node scripts/migrate.js --reset            # 清空记录（不删表），重新标记全部为已执行
 *
 * 需要在根目录 .env 中配置:
 *   DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
 *
 * 连接字符串在 Supabase Dashboard → Settings → Database → Connection string (URI) 获取
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// 从 .env 文件读取 DATABASE_URL
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    // 也检查 apps/portal/.env 里是否有
    console.error('Missing .env file in project root.');
    console.error('Create it with: DATABASE_URL=postgresql://postgres.[ref]:[password]@...');
    console.error('Get connection string from Supabase Dashboard → Settings → Database');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

async function getExecutedMigrations(client) {
  const { rows } = await client.query(
    'SELECT name, executed_at FROM _migrations ORDER BY name'
  );
  return rows;
}

async function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
  return files;
}

async function runMigration(client, filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, 'utf-8');

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [filename]
    );
    await client.query('COMMIT');
    console.log(`  ✓ ${filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`  ✗ ${filename}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

async function main() {
  loadEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set in .env');
    console.error('Get it from Supabase Dashboard → Settings → Database → Connection string (URI)');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    await ensureMigrationTable(client);

    // --status: show executed migrations
    if (args.includes('--status')) {
      const executed = await getExecutedMigrations(client);
      const files = await getMigrationFiles();
      console.log('Migration Status:\n');
      for (const file of files) {
        const record = executed.find(e => e.name === file);
        if (record) {
          console.log(`  ✓ ${file}  (${new Date(record.executed_at).toLocaleString()})`);
        } else {
          console.log(`  ○ ${file}  (pending)`);
        }
      }
      return;
    }

    // --reset: mark all as executed without running
    if (args.includes('--reset')) {
      const files = await getMigrationFiles();
      for (const file of files) {
        await client.query(
          'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
          [file]
        );
      }
      console.log(`Marked ${files.length} migrations as executed.`);
      return;
    }

    // Run specific migration by number prefix
    if (args.length > 0 && !args[0].startsWith('-')) {
      const prefix = args[0];
      const files = await getMigrationFiles();
      const target = files.find(f => f.startsWith(prefix));
      if (!target) {
        console.error(`No migration file starting with "${prefix}"`);
        process.exit(1);
      }
      console.log(`Running migration: ${target}\n`);
      await runMigration(client, target);
      return;
    }

    // Run all pending migrations
    const executed = await getExecutedMigrations(client);
    const executedNames = new Set(executed.map(e => e.name));
    const files = await getMigrationFiles();
    const pending = files.filter(f => !executedNames.has(f));

    if (pending.length === 0) {
      console.log('All migrations are up to date.');
      return;
    }

    console.log(`Running ${pending.length} pending migration(s):\n`);
    for (const file of pending) {
      await runMigration(client, file);
    }
    console.log('\nDone.');
  } catch (err) {
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
