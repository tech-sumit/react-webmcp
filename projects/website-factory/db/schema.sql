-- Website Factory — SQLite Schema
-- Tracks all website generation projects through the pipeline.
--
-- Usage:
--   sqlite3 data/website-factory.db < projects/website-factory/db/schema.sql

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================
-- Main projects table
-- ============================================================
CREATE TABLE IF NOT EXISTS website_projects (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id        TEXT UNIQUE NOT NULL,
  business_name     TEXT NOT NULL,
  repo_slug         TEXT NOT NULL,
  repo_url          TEXT,
  category          TEXT NOT NULL CHECK (category IN ('restaurant', 'salon', 'agency', 'multiplex', 'gym', 'clinic', 'generic')),
  client_email      TEXT NOT NULL,
  custom_domain     TEXT,
  description       TEXT,
  style_preset      TEXT NOT NULL DEFAULT 'modern-dark' CHECK (style_preset IN ('modern-dark', 'clean-light', 'bold-color')),
  primary_color     TEXT DEFAULT '#2563EB',
  logo_url          TEXT,
  google_maps_url   TEXT,

  -- Status tracking
  -- intake → enriching → content_gen → mockup_gen → site_building → pushing → deploying → dns_setup → live → error
  status            TEXT NOT NULL DEFAULT 'intake',

  -- AI artifacts
  mockup_image_path TEXT,           -- Local path or GitHub raw URL of the mockup PNG
  cursor_session_id TEXT,           -- Cursor CLI session ID for debugging

  -- Data snapshots (stored as JSON text)
  enriched_data     TEXT,           -- JSON: address, phone, hours, reviews, photos, coordinates
  ai_content        TEXT,           -- JSON: headline, about, services, faq, seo, cta, testimonials
  site_config       TEXT,           -- JSON: merged config passed to the site

  -- URLs
  pages_url         TEXT,           -- e.g. https://owner.github.io/repo-slug
  cms_url           TEXT,           -- e.g. https://owner.github.io/repo-slug/admin/

  -- Timestamps
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  published_at      TEXT,

  -- Error tracking
  error_message     TEXT,
  error_stage       TEXT,           -- Which stage failed
  retry_count       INTEGER NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON website_projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_email ON website_projects(client_email);
CREATE INDEX IF NOT EXISTS idx_projects_repo ON website_projects(repo_slug);

-- ============================================================
-- Pipeline execution log — one row per stage transition
-- ============================================================
CREATE TABLE IF NOT EXISTS pipeline_log (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id      TEXT NOT NULL REFERENCES website_projects(project_id) ON DELETE CASCADE,
  stage           TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'retrying')),
  message         TEXT,
  duration_ms     INTEGER,
  metadata        TEXT,           -- JSON: any additional context (API response snippets, etc.)
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_log_project ON pipeline_log(project_id);
CREATE INDEX IF NOT EXISTS idx_log_stage ON pipeline_log(stage);

-- ============================================================
-- Auto-update updated_at on website_projects
-- ============================================================
CREATE TRIGGER IF NOT EXISTS trg_projects_updated_at
  AFTER UPDATE ON website_projects
  FOR EACH ROW
BEGIN
  UPDATE website_projects SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = NEW.id;
END;

-- ============================================================
-- View: active projects with latest stage
-- ============================================================
CREATE VIEW IF NOT EXISTS v_active_projects AS
SELECT
  wp.*,
  pl.stage AS latest_stage,
  pl.status AS latest_stage_status,
  pl.created_at AS latest_stage_at
FROM website_projects wp
LEFT JOIN (
  SELECT project_id, stage, status, created_at,
         ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at DESC) AS rn
  FROM pipeline_log
) pl ON pl.project_id = wp.project_id AND pl.rn = 1
WHERE wp.status != 'live'
ORDER BY wp.created_at DESC;
