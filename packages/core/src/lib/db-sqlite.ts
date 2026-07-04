/**
 * SQLite Database Adapter (Phase 2.2)
 *
 * Lightweight local database fallback for single-user desktop mode.
 * Used when Postgres is not available and the app is running via the
 * Tauri desktop wrapper or in standalone CLI mode.
 *
 * Usage:
 *   import { getLocalDb } from './lib/db-sqlite';
 *   const db = getLocalDb();
 *   const result = db.exec('SELECT * FROM evidence WHERE client_id = ?', [1]);
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Lazy-import better-sqlite3 (optional dependency — only needed for local mode)
let Database: any = null;
try {
  Database = require('better-sqlite3');
} catch {
  // better-sqlite3 not installed — Postgres mode
}

const DB_DIR = process.env.COMPLIANCEOS_DATA_DIR
  || join(process.env.HOME || process.env.USERPROFILE || '/tmp', '.complianceos');

const DB_PATH = join(DB_DIR, 'complianceos.db');

let db: any = null;

export function getLocalDb(): any {
  if (db) return db;

  if (!Database) {
    throw new Error(
      'better-sqlite3 is not installed. Run: npm install better-sqlite3\n' +
      'Or set DATABASE_URL for Postgres mode.'
    );
  }

  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run initial schema migration
  runMigrations(db);

  return db;
}

function runMigrations(db: any): void {
  // Core tables for local single-user mode
  db.exec(`
    CREATE TABLE IF NOT EXISTS local_clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT 'Default Workspace',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS local_evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      file_path TEXT,
      status TEXT DEFAULT 'pending',
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES local_clients(id)
    );

    CREATE TABLE IF NOT EXISTS local_controls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES local_clients(id)
    );

    -- Seed default workspace if empty
    INSERT OR IGNORE INTO local_clients (id, name) VALUES (1, 'Default Workspace');
  `);
}

/**
 * Check if SQLite mode is available (better-sqlite3 installed).
 */
export function isLocalModeAvailable(): boolean {
  return Database !== null;
}

/**
 * Close the local database connection.
 */
export function closeLocalDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
