const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');

function nativeBindingPath() {
  if (!process.versions.electron) return null;
  const p = path.join(__dirname, '..', 'vendor', 'better_sqlite3-electron.node');
  return fs.existsSync(p) ? p : null;
}

function genToken(len = 24) {
  return crypto.randomBytes(len).toString('hex');
}

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];

function openDb(dbPath) {
  fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  const nativeBinding = nativeBindingPath();
  const db = new Database(dbPath, nativeBinding ? { nativeBinding } : {});
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      employment_type TEXT NOT NULL DEFAULT 'full-time',
      status TEXT NOT NULL DEFAULT 'open',        -- open | closed
      public_slug TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      cover_letter TEXT NOT NULL DEFAULT '',
      resume_path TEXT,                            -- stored filename inside uploads dir
      resume_name TEXT,                            -- original (sanitized) filename
      stage TEXT NOT NULL DEFAULT 'applied',       -- applied|screening|interview|offer|hired|rejected
      rating INTEGER NOT NULL DEFAULT 0,           -- 0 = unrated, else 1-5
      tags TEXT NOT NULL DEFAULT '',               -- comma-separated
      source TEXT NOT NULL DEFAULT 'careers-page', -- careers-page | manual
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL DEFAULT 'note',           -- note | email
      body TEXT NOT NULL,
      at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scorecards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER NOT NULL,
      interviewer TEXT NOT NULL DEFAULT '',
      criteria_json TEXT NOT NULL DEFAULT '[]',    -- [{criterion, rating 1-5, comment}]
      at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_candidates_job ON candidates(job_id, stage);
    CREATE INDEX IF NOT EXISTS idx_notes_candidate ON notes(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_scorecards_candidate ON scorecards(candidate_id);
  `);

  return db;
}

module.exports = { openDb, genToken, STAGES };
