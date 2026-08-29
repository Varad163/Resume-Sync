/** Typed access to the platform API. One place that knows about transport. */

import type { Finding, MigrationPlan, ScanRecord, PqcCertificate, WatchtowerDiff, ForgeVerificationReport } from "@ironbastion/core";
import type { CycloneDxBom } from "@ironbastion/cbom";

export interface Posture {
  overall: number;
  severity: string;
  counts: Record<string, number>;
}

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  targets: unknown[];
  monitoringEnabled?: boolean;
  monitoringInterval?: number;
  lastMonitoredAt?: string | null;
  createdAt: string;
}

export interface ScanDetail {
  scan: ScanRecord;
  posture?: Posture;
  notes: string[];
  inventory?: { summary: string; observations: string[] };
}

export interface ToolCallTrace {
  turn: number;
  tool: string;
  input: Record<string, unknown>;
  resultPreview: string;
  resultBytes: number;
  failed: boolean;
  durationMs: number;
}

export interface TurnTrace {
  turn: number;
  inputTokens: number;
  outputTokens: number;
  stopReason: string | null;
  text: string;
  toolNames: string[];
  rejection?: string;
}

export interface AgentDecision {
  subject: string;
  outcome: string;
  confidence?: number;
  rationale: string;
}

export interface AgentTrace {
  agentId: string;
  phase: string;
  model: string;
  promptVersion: string;
  durationMs: number;
  turns: TurnTrace[];
  toolCalls: ToolCallTrace[];
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  decisions: AgentDecision[];
  status: string;
  error?: string;
  task: string;
}

export interface CollectorRun {
  collectorId: string;
  version: string;
  target: string;
  unitsScanned: number;
  candidates: number;
  durationMs: number;
  notes: string[];
}

export interface AuditEntry {
  actor: string;
  action: string;
  subject: string;
  at: string;
  detail: Record<string, unknown>;
}

const TOKEN_KEY = "ironbastion.token";

export function currentToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "dev.tnt_demo.demo@ironbastion.ai";
  } catch {
    return "dev.tnt_demo.demo@ironbastion.ai";
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* a viewer with storage disabled still gets the default token */
  }
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${currentToken()}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}

export const api = {
  health: () => request<{ status: string; auth: string; queue: string }>("/health"),
  projects: () => request<{ projects: Project[] }>("/v1/projects"),
  scans: (projectId?: string) =>
    request<{ scans: (ScanRecord & { posture?: Posture })[] }>(
      `/v1/scans${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`,
    ),
  scan: (id: string) => request<ScanDetail>(`/v1/scans/${id}`),
  findings: (id: string) => request<{ findings: Finding[] }>(`/v1/scans/${id}/findings`),
  cbom: (id: string) => request<CycloneDxBom>(`/v1/scans/${id}/cbom`),
  plan: (id: string) =>
    request<{ plan: MigrationPlan; customPlan: MigrationPlan | null }>(`/v1/scans/${id}/plan`),
  saveCustomPlan: (id: string, plan: MigrationPlan) =>
    request<{ plan: MigrationPlan }>(`/v1/scans/${id}/plan/custom`, {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),
  resetCustomPlan: (id: string) =>
    request<{ status: string }>(`/v1/scans/${id}/plan/custom`, {
      method: "DELETE",
    }),
  agents: (id: string) =>
    request<{ traces: AgentTrace[]; collectorRuns: CollectorRun[] }>(`/v1/scans/${id}/agents`),
  audit: () => request<{ entries: AuditEntry[] }>("/v1/audit"),
  startScan: (projectId: string) =>
    request<{ scan: ScanRecord }>("/v1/scans", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    }),
  certificate: (id: string) => request<PqcCertificate>(`/v1/scans/${id}/certificate`),
  publicKey: () => request<{ publicKey: string }>("/v1/certificate-public-key"),
  watchtower: (projectId: string) => request<WatchtowerResponse>(`/v1/projects/${projectId}/watchtower`),
  monitorProject: (projectId: string) =>
    request<{ status: "up-to-date" | "scan-queued" | "no-git-targets"; commitHash: string; scan?: ScanRecord }>(
      `/v1/projects/${projectId}/monitor`,
      { method: "POST" }
    ),
  forge: (scanId: string) => request<{ report: ForgeVerificationReport | null }>(`/v1/scans/${scanId}/forge`),
  checkForge: (scanId: string) => request<{ report: ForgeVerificationReport }>(`/v1/scans/${scanId}/forge/check`, { method: "POST" }),
  configureMonitoring: (projectId: string, enabled: boolean, interval: number) =>
    request<{ success: boolean }>(`/v1/projects/${projectId}/monitoring`, {
      method: "POST",
      body: JSON.stringify({ enabled, interval }),
    }),
  reportUrl: (id: string) => `/v1/scans/${id}/report`,
};

export interface WatchtowerHistoryItem {
  readonly id: string;
  readonly status: string;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly postureScore: number | null;
  readonly targets: unknown[];
}

export interface WatchtowerResponse extends WatchtowerDiff {
  readonly history: WatchtowerHistoryItem[];
}
