-- Run this in the Neon SQL editor to create all tables

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  category TEXT NOT NULL,
  lane TEXT,
  customer TEXT,
  duration_minutes INTEGER,
  is_backlog BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order BIGINT NOT NULL DEFAULT 0,
  project_id TEXT,
  due_date TEXT,
  due_time TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  project_id TEXT,
  default_duration_minutes INTEGER,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS routine_sessions (
  id TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS brain_dump_items (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  rating INTEGER NOT NULL,
  rating_note TEXT,
  bed_time TEXT,
  wake_time TEXT,
  learning TEXT,
  tomorrow TEXT,
  photo_uris TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_goals (
  id TEXT PRIMARY KEY,
  week_start TEXT NOT NULL,
  text TEXT NOT NULL,
  is_wish BOOLEAN NOT NULL DEFAULT FALSE,
  achieved BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS dev_goals (
  id TEXT PRIMARY KEY,
  week_start TEXT NOT NULL UNIQUE,
  target_hours INTEGER NOT NULL,
  logged_minutes INTEGER NOT NULL DEFAULT 0
);
