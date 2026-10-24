import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { PATHS } from './paths'
import { log } from './logger'

mkdirSync(dirname(PATHS.db()), { recursive: true })
export const db = new Database(PATHS.db())
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('microsoft', 'offline')),
    username TEXT NOT NULL,
    uuid TEXT NOT NULL,
    skin_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    xuid TEXT,
    expires_at INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    share_options INTEGER NOT NULL DEFAULT 1,
    share_config INTEGER NOT NULL DEFAULT 1,
    share_resourcepacks INTEGER NOT NULL DEFAULT 0,
    share_shaderpacks INTEGER NOT NULL DEFAULT 0,
    directory TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS instances (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    minecraft_version TEXT NOT NULL,
    loader TEXT NOT NULL,
    loader_version TEXT,
    icon_path TEXT,
    ram_min_mb INTEGER NOT NULL DEFAULT 1024,
    ram_max_mb INTEGER NOT NULL DEFAULT 4096,
    java_path TEXT,
    jvm_args TEXT,
    game_args TEXT,
    directory TEXT NOT NULL,
    profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    created_at INTEGER NOT NULL,
    last_played_at INTEGER,
    total_playtime_ms INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS downloads (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    target_path TEXT NOT NULL,
    total_bytes INTEGER,
    received_bytes INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    error TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS favorites (
    project_id TEXT NOT NULL,
    project_type TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (project_id, project_type)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

const cols = (t: string) => (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map(c => c.name)

if (!cols('instances').includes('profile_id')) db.exec('ALTER TABLE instances ADD COLUMN profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL')
if (!cols('instances').includes('account_id')) db.exec('ALTER TABLE instances ADD COLUMN account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL')
if (!cols('accounts').includes('type')) db.exec("ALTER TABLE accounts ADD COLUMN type TEXT NOT NULL DEFAULT 'microsoft'")
if (!cols('accounts').includes('xuid')) db.exec("ALTER TABLE accounts ADD COLUMN xuid TEXT")

log.info('db ready')