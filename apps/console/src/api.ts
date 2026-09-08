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
const LOGOUT_FLAG = "ironbastion.logged_out";

export function currentToken(): string {
  try {
    if (localStorage.getItem(LOGOUT_FLAG) === "true") {
      return "";
    }
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored !== null) return stored;
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ) {
      return "dev.tnt_demo.demo@ironbastion.ai";
    }
    return "";
  } catch {
    return "";
  }
}

export function setToken(token: string | null): void {
  try {
    if (token && token.trim().length > 0) {
      localStorage.setItem(TOKEN_KEY, token.trim());
      localStorage.removeItem(LOGOUT_FLAG);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.setItem(LOGOUT_FLAG, "true");
    }
  } catch {
    /* storage disabled */
  }
}

export function clearToken(): void {
  setToken(null);
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = currentToken();
  const headers: Record<string, string> = {
    ...(init.body ? { "content-type": "application/json" } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (token && !headers["authorization"]) {
    headers["authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
    }
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

async function requestText(path: string, init: RequestInit = {}): Promise<string> {
  const token = currentToken();
  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (token && !headers["authorization"]) {
    headers["authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
    }
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(response.status, message);
  }

  return await response.text();
}

export const api = {
  health: () => request<{ status: string; auth: string; queue: string }>("/health"),
  projects: () => request<{ projects: Project[] }>("/v1/projects"),
  createProject: (name: string, targets: unknown[]) =>
    request<{ project: Project }>("/v1/projects", {
      method: "POST",
      body: JSON.stringify({ name, targets }),
    }),
  updateProject: (id: string, name: string, targets: unknown[]) =>
    request<{ project: Project }>(`/v1/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, targets }),
    }),
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
  uploadZipScan: async (projectId: string, file: File): Promise<{ scan: ScanRecord }> => {
    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("file", file);

    const token = currentToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`/v1/projects/${encodeURIComponent(projectId)}/scans/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearToken();
      }
      let message = `${response.status} ${response.statusText}`;
      try {
        const body = (await response.json()) as { message?: string; error?: string; detail?: string };
        message = body.detail
          ? `${body.error ?? "Upload error"}: ${body.detail}`
          : body.message ?? body.error ?? message;
      } catch {
        /* non-JSON error */
      }
      throw new ApiError(response.status, message);
    }

    return await response.json();
  },
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
  reportHtml: (id: string) => requestText(`/v1/scans/${id}/report`),

  // GitHub App Integration
  getGithubStatus: () => request<GithubStatusResponse>("/v1/integrations/github/status"),
  connectGithub: () => request<{ configured: boolean; url: string }>("/v1/integrations/github/connect"),
  disconnectGithub: () => request<{ success: boolean }>("/v1/integrations/github", { method: "DELETE" }),
  getGithubRepositories: () => request<{ repositories: GithubRepository[] }>("/v1/integrations/github/repositories"),
  getGithubBranches: (owner: string, repo: string) =>
    request<{ branches: GithubBranch[] }>(`/v1/integrations/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`),
};

export interface GithubStatusResponse {
  readonly configured: boolean;
  readonly appName: string | null;
  readonly connected: boolean;
  readonly installation: {
    readonly githubInstallationId: string;
    readonly accountLogin: string;
    readonly accountType: string;
  } | null;
  readonly error?: string | null;
}

export interface GithubRepository {
  readonly id: number;
  readonly name: string;
  readonly fullName: string;
  readonly owner: string;
  readonly defaultBranch: string;
  readonly private: boolean;
  readonly cloneUrl: string;
  readonly htmlUrl: string;
}

export interface GithubBranch {
  readonly name: string;
  readonly commitSha: string;
  readonly isDefault: boolean;
}

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
