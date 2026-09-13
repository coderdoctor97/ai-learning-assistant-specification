import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

/**
 * Embedded, zero-dependency SQLite database backed by Node's built-in
 * `node:sqlite`. This keeps the studio genuinely local-first: no external
 * database server, no native build step, no connection string.
 */
const dataDir = process.env.STUDIO_DATA_DIR ?? path.join(process.cwd(), ".data");
mkdirSync(dataDir, { recursive: true });
const databaseFile = process.env.STUDIO_DB_PATH ?? path.join(dataDir, "studio.db");

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT,
  api_key_env TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  built_in INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unknown',
  status_message TEXT,
  last_checked_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  context_length INTEGER NOT NULL DEFAULT 8192,
  max_output INTEGER NOT NULL DEFAULT 2048,
  capabilities TEXT NOT NULL,
  pricing TEXT,
  is_free INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS models_provider_idx ON models(provider_id);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  active_provider_id TEXT,
  active_model_id TEXT,
  active_config_id TEXT,
  theme TEXT NOT NULL DEFAULT 'editorial',
  context_level TEXT NOT NULL DEFAULT 'minimal',
  max_output_tokens INTEGER NOT NULL DEFAULT 1400,
  temperature REAL NOT NULL DEFAULT 0.4,
  dynamic_agent INTEGER NOT NULL DEFAULT 0,
  reasoning_enabled INTEGER NOT NULL DEFAULT 0,
  streaming INTEGER NOT NULL DEFAULT 1,
  tool_use INTEGER NOT NULL DEFAULT 0,
  web_retrieval INTEGER NOT NULL DEFAULT 1,
  learner_profile TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'custom',
  preset_key TEXT,
  steps TEXT NOT NULL,
  built_in INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  accent TEXT NOT NULL DEFAULT 'rose',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  config_id TEXT,
  config_name TEXT NOT NULL DEFAULT 'Default methodology',
  config_steps TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_stage INTEGER NOT NULL DEFAULT 0,
  learning_state TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  dynamic_agent INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER
);
CREATE INDEX IF NOT EXISTS sessions_project_idx ON sessions(project_id);

CREATE TABLE IF NOT EXISTS stages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  "index" INTEGER NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  reasoning TEXT,
  resources TEXT NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ready',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS stages_session_idx ON stages(session_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  reasoning TEXT,
  resources TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_stage_idx ON messages(stage_id);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  kind TEXT NOT NULL,
  extracted_text TEXT NOT NULL DEFAULT '',
  data_url TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS attachments_session_idx ON attachments(session_id);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  source_file TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
`;

const globalForDb = globalThis as typeof globalThis & {
  __studioSqlite?: DatabaseSync;
};

/**
 * The connection is opened lazily on first query. This keeps Next's build-time
 * module evaluation (which runs many workers in parallel) from opening the same
 * database file at once, and keeps `next build` fast.
 */
function getSqlite(): DatabaseSync {
  if (!globalForDb.__studioSqlite) {
    const sqlite = new DatabaseSync(databaseFile);
    sqlite.exec("PRAGMA busy_timeout = 5000;");
    sqlite.exec("PRAGMA journal_mode = WAL;");
    sqlite.exec("PRAGMA foreign_keys = ON;");
    sqlite.exec(SCHEMA_SQL);
    // Additive migration for existing local databases; keep all stored settings.
    // The write lock makes the introspection + ALTER safe across dev workers.
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const columns = sqlite.prepare("PRAGMA table_info(settings)").all();
      if (!columns.some((column) => column.name === "tool_use")) {
        sqlite.exec("ALTER TABLE settings ADD COLUMN tool_use INTEGER NOT NULL DEFAULT 0");
      }
      sqlite.exec("COMMIT");
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
    globalForDb.__studioSqlite = sqlite;
  }
  return globalForDb.__studioSqlite;
}

export const db = drizzle(
  async (sql, params, method) => {
    const statement = getSqlite().prepare(sql);
    statement.setReturnArrays(true);
    if (method === "run") {
      statement.run(...(params as never[]));
      return { rows: [] as unknown[] };
    }
    if (method === "get") {
      const row = statement.get(...(params as never[]));
      return { rows: row as unknown as unknown[] };
    }
    const rows = statement.all(...(params as never[])) as unknown;
    return { rows: rows as unknown[] };
  },
  { schema },
);
