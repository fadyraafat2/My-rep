const fs = require('fs');
const path = require('path');
const db = require('./database');

const migrationsDir = path.join(__dirname, 'migrations');
const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TEXT DEFAULT CURRENT_TIMESTAMP)');
const applied = new Set(db.prepare('SELECT name FROM schema_migrations').all().map((r) => r.name));

for (const file of files) {
  if (applied.has(file)) continue;
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  db.exec(sql);
  db.prepare('INSERT INTO schema_migrations(name) VALUES (?)').run(file);
  console.log(`Applied migration: ${file}`);
}

console.log('Migrations complete');
