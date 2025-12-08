-- Ad Astra Game Tables
-- Run with: npx wrangler d1 execute kraken-arkade --file=migrations/0002_adastra.sql

-- Accounts table
CREATE TABLE IF NOT EXISTS adastra_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_login TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0,
    is_banned INTEGER NOT NULL DEFAULT 0
);

-- Players table
CREATE TABLE IF NOT EXISTS adastra_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    pilot_name TEXT NOT NULL,
    ship_name TEXT,
    credits INTEGER DEFAULT 10000,
    turns INTEGER DEFAULT 50,
    current_sector INTEGER DEFAULT 1,
    ship_type TEXT DEFAULT 'scout',
    cargo TEXT DEFAULT '{}',
    equipment TEXT DEFAULT '{}',
    game_state TEXT DEFAULT '{}',
    last_activity TEXT,
    ship_variant INTEGER DEFAULT 1,
    FOREIGN KEY (account_id) REFERENCES adastra_accounts(id)
);

-- Settings table
CREATE TABLE IF NOT EXISTS adastra_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Multiplayer state table
CREATE TABLE IF NOT EXISTS adastra_multiplayer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Sessions table
CREATE TABLE IF NOT EXISTS adastra_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES adastra_accounts(id)
);

-- Default settings
INSERT OR IGNORE INTO adastra_settings (key, value) VALUES ('starting_sector', '1');
INSERT OR IGNORE INTO adastra_settings (key, value) VALUES ('starting_credits', '10000');
INSERT OR IGNORE INTO adastra_settings (key, value) VALUES ('starting_turns', '50');
INSERT OR IGNORE INTO adastra_settings (key, value) VALUES ('starting_fuel', '100');
INSERT OR IGNORE INTO adastra_settings (key, value) VALUES ('starting_hull', '100');
INSERT OR IGNORE INTO adastra_settings (key, value) VALUES ('starting_shields', '100');
