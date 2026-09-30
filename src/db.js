const Database = require("better-sqlite3");

const db = new Database("records.db");

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_wallet TEXT NOT NULL,
    namespace TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    tags TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    expires_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_records_owner_wallet
  ON records(owner_wallet);

  CREATE INDEX IF NOT EXISTS idx_records_namespace
  ON records(namespace);

  CREATE INDEX IF NOT EXISTS idx_records_key
  ON records(key);

  CREATE INDEX IF NOT EXISTS idx_records_expires_at
  ON records(expires_at);
`);

module.exports = db;
