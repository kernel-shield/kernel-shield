-- Kernel Shield · esquema de base de datos (Cloudflare D1 / SQLite)
-- Aplicar con: wrangler d1 execute kernelshield-db --file=./schema.sql

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL,
  email_verified  INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at   TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL,
  user_agent  TEXT,
  ip          TEXT
);

CREATE TABLE IF NOT EXISTS email_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK(type IN ('verify','reset')),
  expires_at  TEXT NOT NULL,
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quotes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  country        TEXT,
  discord        TEXT,
  requested      TEXT,
  location_pref  TEXT,
  message        TEXT,
  status         TEXT NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente','cotizado','aprobado','rechazado')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_name   TEXT NOT NULL,
  location    TEXT,
  ip_address  TEXT,
  status      TEXT NOT NULL DEFAULT 'activo' CHECK(status IN ('activo','suspendido','cancelado')),
  renews_at   TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rate_limits (
  rkey        TEXT PRIMARY KEY,
  hits        TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user  ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_exp   ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_tokens_user    ON email_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user    ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_services_user  ON services(user_id);
