/**
 * The schema, as a module rather than a file read at runtime.
 *
 * The apps ship as a single bundled file, so anything loaded with `readFile`
 * relative to the source tree would not exist in the container. Keeping the SQL
 * here means the same migration runs in tests, locally and in Aurora.
 */

export const SCHEMA_SQL = String.raw`
-- IronBastion platform schema.
--
-- Every table that holds customer data carries tenant_id, and every repository
-- function requires it. Isolation is enforced in one place — the repositories
-- below — rather than trusted to each call site.

CREATE TABLE IF NOT EXISTS tenants (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  settings      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'member',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS projects (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  targets       JSONB NOT NULL DEFAULT '[]'::jsonb,
  monitoring_enabled BOOLEAN NOT NULL DEFAULT false,
  monitoring_interval INTEGER NOT NULL DEFAULT 60,
  last_monitored_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_tenant_idx ON projects (tenant_id);

CREATE TABLE IF NOT EXISTS scans (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status        TEXT NOT NULL,
  phase         TEXT NOT NULL,
  targets       JSONB NOT NULL DEFAULT '[]'::jsonb,
  options       JSONB NOT NULL DEFAULT '{}'::jsonb,
  stats         JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes         JSONB NOT NULL DEFAULT '[]'::jsonb,
  posture       JSONB,
  error         TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS scans_tenant_started_idx ON scans (tenant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS scans_project_idx ON scans (project_id, started_at DESC);

CREATE TABLE IF NOT EXISTS findings (
  id            TEXT NOT NULL,
  scan_id       TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Denormalised for filtering and sorting; 'document' remains authoritative.
  algorithm     TEXT NOT NULL,
  component     TEXT NOT NULL,
  severity      TEXT NOT NULL,
  score         INTEGER NOT NULL,
  status        TEXT NOT NULL,
  quantum       TEXT NOT NULL,
  judged_by     TEXT NOT NULL,
  document      JSONB NOT NULL,
  PRIMARY KEY (scan_id, id)
);

CREATE INDEX IF NOT EXISTS findings_tenant_scan_idx ON findings (tenant_id, scan_id);
CREATE INDEX IF NOT EXISTS findings_score_idx ON findings (scan_id, score DESC);

CREATE TABLE IF NOT EXISTS artefacts (
  scan_id       TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,
  document      JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (scan_id, kind)
);

-- Who did what. A security product has to be able to answer that.
CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  actor         TEXT NOT NULL,
  action        TEXT NOT NULL,
  subject       TEXT NOT NULL,
  detail        JSONB NOT NULL DEFAULT '{}'::jsonb,
  at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_tenant_at_idx ON audit_log (tenant_id, at DESC);

-- Migrations for existing databases
ALTER TABLE projects ADD COLUMN IF NOT EXISTS monitoring_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS monitoring_interval INTEGER NOT NULL DEFAULT 60;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_monitored_at TIMESTAMPTZ;

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_tenant_isolation ON projects;
CREATE POLICY project_tenant_isolation ON projects FOR ALL
  USING (nullif(current_setting('ironbastion.current_tenant_id', true), '') IS NULL OR tenant_id = current_setting('ironbastion.current_tenant_id', true))
  WITH CHECK (nullif(current_setting('ironbastion.current_tenant_id', true), '') IS NULL OR tenant_id = current_setting('ironbastion.current_tenant_id', true));

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scan_tenant_isolation ON scans;
CREATE POLICY scan_tenant_isolation ON scans FOR ALL
  USING (nullif(current_setting('ironbastion.current_tenant_id', true), '') IS NULL OR tenant_id = current_setting('ironbastion.current_tenant_id', true))
  WITH CHECK (nullif(current_setting('ironbastion.current_tenant_id', true), '') IS NULL OR tenant_id = current_setting('ironbastion.current_tenant_id', true));

ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS finding_tenant_isolation ON findings;
CREATE POLICY finding_tenant_isolation ON findings FOR ALL
  USING (nullif(current_setting('ironbastion.current_tenant_id', true), '') IS NULL OR tenant_id = current_setting('ironbastion.current_tenant_id', true))
  WITH CHECK (nullif(current_setting('ironbastion.current_tenant_id', true), '') IS NULL OR tenant_id = current_setting('ironbastion.current_tenant_id', true));

ALTER TABLE artefacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE artefacts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS artefact_tenant_isolation ON artefacts;
CREATE POLICY artefact_tenant_isolation ON artefacts FOR ALL
  USING (nullif(current_setting('ironbastion.current_tenant_id', true), '') IS NULL OR tenant_id = current_setting('ironbastion.current_tenant_id', true))
  WITH CHECK (nullif(current_setting('ironbastion.current_tenant_id', true), '') IS NULL OR tenant_id = current_setting('ironbastion.current_tenant_id', true));

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_tenant_isolation ON audit_log;
CREATE POLICY audit_tenant_isolation ON audit_log FOR ALL
  USING (nullif(current_setting('ironbastion.current_tenant_id', true), '') IS NULL OR tenant_id = current_setting('ironbastion.current_tenant_id', true))
  WITH CHECK (nullif(current_setting('ironbastion.current_tenant_id', true), '') IS NULL OR tenant_id = current_setting('ironbastion.current_tenant_id', true));

CREATE TABLE IF NOT EXISTS github_installations (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  github_installation_id TEXT NOT NULL,
  account_login TEXT NOT NULL,
  account_type  TEXT NOT NULL DEFAULT 'User',
  target_type   TEXT NOT NULL DEFAULT 'all',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, github_installation_id)
);

CREATE INDEX IF NOT EXISTS github_installations_tenant_idx ON github_installations (tenant_id);

ALTER TABLE github_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_installations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS github_installations_tenant_isolation ON github_installations;
CREATE POLICY github_installations_tenant_isolation ON github_installations FOR ALL
  USING (nullif(current_setting('ironbastion.current_tenant_id', true), '') IS NULL OR tenant_id = current_setting('ironbastion.current_tenant_id', true))
  WITH CHECK (nullif(current_setting('ironbastion.current_tenant_id', true), '') IS NULL OR tenant_id = current_setting('ironbastion.current_tenant_id', true));
`;
