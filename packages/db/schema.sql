-- Phase 4D schema for local Postgres (DB: uplift). Applied via psql.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT,
  timezone TEXT DEFAULT 'Africa/Lagos', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY, moods JSONB DEFAULT '[]', situations JSONB DEFAULT '[]',
  goals_focus JSONB DEFAULT '[]', styles JSONB DEFAULT '[]', faith_opt_in BOOLEAN DEFAULT FALSE,
  notify_times JSONB DEFAULT '["08:00","13:00","20:00"]', frequency TEXT DEFAULT 'daily'
);
CREATE TABLE IF NOT EXISTS uplifts (
  id TEXT PRIMARY KEY, body TEXT NOT NULL, greeting TEXT, category TEXT NOT NULL,
  moods JSONB, situations JSONB, styles JSONB, faith BOOLEAN DEFAULT FALSE,
  scripture TEXT, action_text TEXT
);
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL,
  mood TEXT NOT NULL, note TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL,
  title TEXT NOT NULL, category TEXT, why TEXT, target_date TEXT,
  status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS goal_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), goal_id UUID NOT NULL,
  action_text TEXT NOT NULL, done_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS saves (
  user_id TEXT NOT NULL, uplift_id TEXT NOT NULL, collection TEXT DEFAULT 'favorites',
  PRIMARY KEY (user_id, uplift_id, collection)
);
CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL, uplift_id TEXT NOT NULL, PRIMARY KEY (user_id, uplift_id)
);
CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL,
  uplift_id TEXT NOT NULL, channel TEXT, r2_key TEXT
);
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL,
  prompt TEXT, body TEXT NOT NULL, mood TEXT, gratitude JSONB DEFAULT '[]',
  victory BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS streaks (
  user_id TEXT PRIMARY KEY, current_count INTEGER DEFAULT 0,
  longest INTEGER DEFAULT 0, last_seen_date TEXT
);
CREATE TABLE IF NOT EXISTS entitlements (
  user_id TEXT PRIMARY KEY, tier TEXT DEFAULT 'free', packs JSONB DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT,
  name TEXT NOT NULL, props JSONB, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL,
  r2_key TEXT NOT NULL, purpose TEXT, mime TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
