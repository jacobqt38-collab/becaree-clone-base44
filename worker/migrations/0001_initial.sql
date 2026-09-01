PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,
  overall_status TEXT NOT NULL DEFAULT 'draft',
  current_step TEXT,
  insurance_type TEXT,
  metadata_ciphertext TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS application_steps (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  step_key TEXT NOT NULL,
  title TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'locked',
  locked INTEGER NOT NULL DEFAULT 1,
  data_ciphertext TEXT,
  version_number INTEGER NOT NULL DEFAULT 0,
  submitted_at INTEGER,
  reviewed_at INTEGER,
  reviewed_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  UNIQUE (application_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_application_steps_app_order
  ON application_steps(application_id, step_order);

CREATE TABLE IF NOT EXISTS application_history (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  step_key TEXT,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  details_ciphertext TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_application_history_app_created
  ON application_history(application_id, created_at DESC);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  event TEXT NOT NULL,
  page TEXT NOT NULL,
  data_ciphertext TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created
  ON analytics_events(created_at DESC);
