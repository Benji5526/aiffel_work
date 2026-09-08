const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'gina.db'));

db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    platform        TEXT NOT NULL,
    platform_user_id TEXT NOT NULL,
    name            TEXT,
    destination     TEXT,
    travel_date     TEXT,
    people          INTEGER,
    interest        TEXT,
    budget          TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(platform, platform_user_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    intent_json TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );
`);

module.exports = db;
