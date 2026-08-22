/**
 * Tenant-scoped repositories.
 *
 * Every function here takes a tenantId and puts it in the WHERE clause. That is
 * the entire isolation model, and it is why these functions exist at all — no
 * route handler is allowed to write SQL, so no route handler can forget.
 */

import {
  EMPTY_STATS,
  newId,
  type Finding,
  type MigrationPlan,
  type ScanOptions,
  type ScanPhase,
  type ScanRecord,
  type ScanStats,
  type ScanStatus,
  type ScanTarget,
} from "@ironbastion/core";
import type { CycloneDxBom } from "@ironbastion/cbom";
import type { Database } from "./driver.js";

export interface Tenant {
  readonly id: string;
  readonly name: string;
  readonly settings: Record<string, unknown>;
}

export interface User {
  readonly id: string;
  readonly tenantId: string;
  readonly email: string;
  readonly name: string;
  readonly role: "owner" | "member" | "viewer";
}

export interface Project {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description: string;
  readonly targets: ScanTarget[];
  readonly createdAt: string;
}

export interface Posture {
  readonly overall: number;
  readonly severity: string;
  readonly counts: Record<string, number>;
}

// ------------------------------------------------------------------ tenants

export async function createTenant(db: Database, name: string): Promise<Tenant> {
  const id = newId("tnt");
  await db.query("INSERT INTO tenants (id, name) VALUES ($1, $2)", [id, name]);
  return { id, name, settings: {} };
}

export async function getTenant(db: Database, id: string): Promise<Tenant | undefined> {
  const { rows } = await db.query<{ id: string; name: string; settings: Record<string, unknown> }>(
    "SELECT id, name, settings FROM tenants WHERE id = $1",
    [id],
  );
  const row = rows[0];
  return row ? { id: row.id, name: row.name, settings: row.settings ?? {} } : undefined;
}

// -------------------------------------------------------------------- users

export async function upsertUser(
  db: Database,
  user: Omit<User, "id"> & { id?: string },
): Promise<User> {
  const id = user.id ?? newId("usr");
  await db.query(
    `INSERT INTO users (id, tenant_id, email, name, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role`,
    [id, user.tenantId, user.email, user.name, user.role],
  );
  const found = await findUserByEmail(db, user.tenantId, user.email);
  return found ?? { ...user, id };
}

export async function findUserByEmail(
  db: Database,
  tenantId: string,
  email: string,
): Promise<User | undefined> {
  const { rows } = await db.query<{
    id: string;
    tenant_id: string;
    email: string;
    name: string;
    role: User["role"];
  }>("SELECT id, tenant_id, email, name, role FROM users WHERE tenant_id = $1 AND email = $2", [
    tenantId,
    email,
  ]);
  const row = rows[0];
  return row
    ? { id: row.id, tenantId: row.tenant_id, email: row.email, name: row.name, role: row.role }
    : undefined;
}

// ----------------------------------------------------------------- projects

export async function createProject(
  db: Database,
  input: { tenantId: string; name: string; description?: string; targets: ScanTarget[] },
): Promise<Project> {
  const id = newId("proj");
  await db.query(
    "INSERT INTO projects (id, tenant_id, name, description, targets) VALUES ($1, $2, $3, $4, $5)",
    [id, input.tenantId, input.name, input.description ?? "", JSON.stringify(input.targets)],
  );
  const project = await getProject(db, input.tenantId, id);
  if (!project) throw new Error("project vanished immediately after insert");
  return project;
}

export async function listProjects(db: Database, tenantId: string): Promise<Project[]> {
  const { rows } = await db.query<ProjectRow>(
    "SELECT id, tenant_id, name, description, targets, created_at FROM projects WHERE tenant_id = $1 ORDER BY created_at DESC",
    [tenantId],
  );
  return rows.map(toProject);
}

export async function getProject(
  db: Database,
  tenantId: string,
  id: string,
): Promise<Project | undefined> {
  const { rows } = await db.query<ProjectRow>(
    "SELECT id, tenant_id, name, description, targets, created_at FROM projects WHERE tenant_id = $1 AND id = $2",
    [tenantId, id],
  );
  return rows[0] ? toProject(rows[0]) : undefined;
}

interface ProjectRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  targets: ScanTarget[] | string;
  created_at: string | Date;
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    targets: parseJson<ScanTarget[]>(row.targets, []),
    createdAt: asIso(row.created_at),
  };
}

// -------------------------------------------------------------------- scans

export async function createScan(
  db: Database,
  input: {
    tenantId: string;
    projectId: string;
    targets: readonly ScanTarget[];
    options: ScanOptions;
  },
): Promise<ScanRecord> {
  const id = newId("scan");
  await db.query(
    `INSERT INTO scans (id, tenant_id, project_id, status, phase, targets, options, stats)
     VALUES ($1, $2, $3, 'queued', 'DISCOVER', $4, $5, $6)`,
    [
      id,
      input.tenantId,
      input.projectId,
      JSON.stringify(input.targets),
      JSON.stringify(input.options),
      JSON.stringify(EMPTY_STATS),
    ],
  );
  const scan = await getScan(db, input.tenantId, id);
  if (!scan) throw new Error("scan vanished immediately after insert");
  return scan;
}

export async function updateScanPhase(
  db: Database,
  scanId: string,
  phase: ScanPhase,
  status: ScanStatus = "running",
): Promise<void> {
  await db.query("UPDATE scans SET phase = $2, status = $3 WHERE id = $1", [scanId, phase, status]);
}

export async function failScan(db: Database, scanId: string, error: string): Promise<void> {
  await db.query(
    "UPDATE scans SET status = 'failed', error = $2, finished_at = now() WHERE id = $1",
    [scanId, error.slice(0, 2000)],
  );
}

export async function completeScan(
  db: Database,
  input: {
    scanId: string;
    tenantId: string;
    stats: ScanStats;
    notes: readonly string[];
    posture: Posture;
    findings: readonly Finding[];
    cbom: CycloneDxBom;
    plan: MigrationPlan;
    inventory: unknown;
  },
): Promise<void> {
  await db.query(
    `UPDATE scans SET status = 'succeeded', phase = 'DONE', finished_at = now(),
     stats = $2, notes = $3, posture = $4 WHERE id = $1`,
    [
      input.scanId,
      JSON.stringify(input.stats),
      JSON.stringify(input.notes),
      JSON.stringify(input.posture),
    ],
  );

  for (const finding of input.findings) {
    await db.query(
      `INSERT INTO findings (id, scan_id, tenant_id, algorithm, component, severity, score, status, quantum, judged_by, document)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (scan_id, id) DO UPDATE SET document = EXCLUDED.document`,
      [
        finding.id,
        input.scanId,
        input.tenantId,
        finding.algorithm,
        finding.component,
        finding.risk.severity,
        finding.risk.score,
        finding.adjudication.status,
        finding.quantum,
        finding.adjudication.provenance.model,
        JSON.stringify(finding),
      ],
    );
  }

  const artefacts: [string, unknown][] = [
    ["cbom", input.cbom],
    ["plan", input.plan],
    ["inventory", input.inventory],
  ];
  for (const [kind, document] of artefacts) {
    await db.query(
      `INSERT INTO artefacts (scan_id, tenant_id, kind, document) VALUES ($1, $2, $3, $4)
       ON CONFLICT (scan_id, kind) DO UPDATE SET document = EXCLUDED.document`,
      [input.scanId, input.tenantId, kind, JSON.stringify(document)],
    );
  }
}

export async function getScan(
  db: Database,
  tenantId: string,
  id: string,
): Promise<ScanRecord | undefined> {
  const { rows } = await db.query<ScanRow>(
    `SELECT id, tenant_id, project_id, status, phase, targets, options, stats, notes, posture, error, started_at, finished_at
     FROM scans WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id],
  );
  return rows[0] ? toScan(rows[0]) : undefined;
}

/** Used by the worker, which has no tenant context until it reads the row. */
export async function getScanUnscoped(db: Database, id: string): Promise<ScanRecord | undefined> {
  const { rows } = await db.query<ScanRow>(
    `SELECT id, tenant_id, project_id, status, phase, targets, options, stats, notes, posture, error, started_at, finished_at
     FROM scans WHERE id = $1`,
    [id],
  );
  return rows[0] ? toScan(rows[0]) : undefined;
}

export async function listScans(
  db: Database,
  tenantId: string,
  options: { projectId?: string; limit?: number } = {},
): Promise<(ScanRecord & { posture?: Posture })[]> {
  const params: unknown[] = [tenantId];
  let sql = `SELECT id, tenant_id, project_id, status, phase, targets, options, stats, notes, posture, error, started_at, finished_at
             FROM scans WHERE tenant_id = $1`;
  if (options.projectId) {
    params.push(options.projectId);
    sql += ` AND project_id = $${params.length}`;
  }
  params.push(options.limit ?? 50);
  sql += ` ORDER BY started_at DESC LIMIT $${params.length}`;

  const { rows } = await db.query<ScanRow>(sql, params);
  return rows.map((row) => ({
    ...toScan(row),
    ...(row.posture ? { posture: parseJson<Posture>(row.posture, undefined as never) } : {}),
  }));
}

interface ScanRow {
  id: string;
  tenant_id: string;
  project_id: string;
  status: ScanStatus;
  phase: ScanPhase;
  targets: unknown;
  options: unknown;
  stats: unknown;
  notes: unknown;
  posture: unknown;
  error: string | null;
  started_at: string | Date;
  finished_at: string | Date | null;
}

function toScan(row: ScanRow): ScanRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    projectId: row.project_id,
    status: row.status,
    phase: row.phase,
    targets: parseJson<ScanTarget[]>(row.targets, []),
    options: parseJson<ScanOptions>(row.options, {} as ScanOptions),
    stats: parseJson<ScanStats>(row.stats, EMPTY_STATS),
    startedAt: asIso(row.started_at),
    ...(row.finished_at ? { finishedAt: asIso(row.finished_at) } : {}),
    ...(row.error ? { error: row.error } : {}),
  };
}

export async function scanNotes(db: Database, tenantId: string, scanId: string): Promise<string[]> {
  const { rows } = await db.query<{ notes: unknown }>(
    "SELECT notes FROM scans WHERE tenant_id = $1 AND id = $2",
    [tenantId, scanId],
  );
  return rows[0] ? parseJson<string[]>(rows[0].notes, []) : [];
}

export async function scanPosture(
  db: Database,
  tenantId: string,
  scanId: string,
): Promise<Posture | undefined> {
  const { rows } = await db.query<{ posture: unknown }>(
    "SELECT posture FROM scans WHERE tenant_id = $1 AND id = $2",
    [tenantId, scanId],
  );
  const raw = rows[0]?.posture;
  return raw ? parseJson<Posture>(raw, undefined as never) : undefined;
}

// ----------------------------------------------------------------- findings

export async function listFindings(
  db: Database,
  tenantId: string,
  scanId: string,
  filter: { severity?: string; status?: string; limit?: number } = {},
): Promise<Finding[]> {
  const params: unknown[] = [tenantId, scanId];
  let sql = "SELECT document FROM findings WHERE tenant_id = $1 AND scan_id = $2";
  if (filter.severity) {
    params.push(filter.severity);
    sql += ` AND severity = $${params.length}`;
  }
  if (filter.status) {
    params.push(filter.status);
    sql += ` AND status = $${params.length}`;
  }
  params.push(filter.limit ?? 500);
  sql += ` ORDER BY score DESC LIMIT $${params.length}`;

  const { rows } = await db.query<{ document: unknown }>(sql, params);
  return rows.map((row) => parseJson<Finding>(row.document, undefined as never));
}

export async function getArtefact<T>(
  db: Database,
  tenantId: string,
  scanId: string,
  kind: string,
): Promise<T | undefined> {
  const { rows } = await db.query<{ document: unknown }>(
    "SELECT document FROM artefacts WHERE tenant_id = $1 AND scan_id = $2 AND kind = $3",
    [tenantId, scanId, kind],
  );
  return rows[0] ? parseJson<T>(rows[0].document, undefined as never) : undefined;
}

// -------------------------------------------------------------------- audit

export async function recordAudit(
  db: Database,
  entry: { tenantId: string; actor: string; action: string; subject: string; detail?: unknown },
): Promise<void> {
  await db.query(
    "INSERT INTO audit_log (tenant_id, actor, action, subject, detail) VALUES ($1, $2, $3, $4, $5)",
    [entry.tenantId, entry.actor, entry.action, entry.subject, JSON.stringify(entry.detail ?? {})],
  );
}

export async function listAudit(
  db: Database,
  tenantId: string,
  limit = 100,
): Promise<{ actor: string; action: string; subject: string; at: string; detail: unknown }[]> {
  const { rows } = await db.query<{
    actor: string;
    action: string;
    subject: string;
    at: string | Date;
    detail: unknown;
  }>("SELECT actor, action, subject, at, detail FROM audit_log WHERE tenant_id = $1 ORDER BY at DESC LIMIT $2", [
    tenantId,
    limit,
  ]);
  return rows.map((row) => ({
    actor: row.actor,
    action: row.action,
    subject: row.subject,
    at: asIso(row.at),
    detail: row.detail,
  }));
}

// ----------------------------------------------------------------- helpers

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function asIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
