import { useEffect, useState } from "react";
import type { CycloneDxBom } from "@ironbastion/cbom";
import type { Finding, ForgeVerificationReport, MigrationPlan } from "@ironbastion/core";

import { AgentsView } from "../agents.js";
import {
  api,
  ApiError,
  type AgentTrace,
  type CollectorRun,
  type ScanDetail,
  type WatchtowerResponse,
} from "../api.js";
import { Empty, FindingsTable, PhaseTrail, Readout, Spectrum } from "../components.js";
import { CertifyModal } from "../features/certify/components/CertifyModal.js";
import { CertifyView } from "../features/certify/components/CertifyView.js";
import { CbomView } from "../features/cbom/components/CbomView.js";
import { Forge } from "../features/forge/components/ForgeTab.js";
import { Inventory } from "../features/inventory/components/InventoryTab.js";
import { Plan } from "../features/plan/components/PlanTab.js";
import { Watchtower } from "../features/watchtower/components/WatchtowerTab.js";
import {
  ZeroCryptoEmptyState,
  NoVulnerableFindingsEmptyState,
} from "../features/findings/components/ZeroCryptoEmptyState.js";

type Tab = "findings" | "agents" | "inventory" | "plan" | "watchtower" | "forge" | "certify" | "cbom";

const SEVERITY_TONE: Record<string, string> = {
  critical: "var(--critical)",
  high: "var(--legacy)",
  medium: "var(--legacy)",
  low: "var(--quantum)",
  informational: "var(--dim)",
};

export function ScanView({ id, initialTab = "findings", onBack }: { id: string; initialTab?: Tab; onBack: () => void }) {
  const [detail, setDetail] = useState<ScanDetail>();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [cbom, setCbom] = useState<CycloneDxBom>();
  const [plan, setPlan] = useState<MigrationPlan>();
  const [customPlan, setCustomPlan] = useState<MigrationPlan | null>(null);
  const [traces, setTraces] = useState<AgentTrace[]>([]);
  const [collectorRuns, setCollectorRuns] = useState<CollectorRun[]>([]);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [selected, setSelected] = useState<string>();
  const [error, setError] = useState<string>();
  const [certifying, setCertifying] = useState(false);
  const [watchtowerDiff, setWatchtowerDiff] = useState<WatchtowerResponse | null>(null);
  const [forgeReport, setForgeReport] = useState<ForgeVerificationReport | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const loaded = await api.scan(id);
        if (!live) return;
        setDetail(loaded);
        if (loaded.scan.status === "succeeded") {
          const [f, b, p, a, w, fo] = await Promise.all([
            api.findings(id),
            api.cbom(id),
            api.plan(id),
            api.agents(id),
            api.watchtower(loaded.scan.projectId).catch(() => null),
            api.forge(id).catch(() => null),
          ]);
          if (!live) return;
          setFindings(f.findings);
          setCbom(b);
          setPlan(p.plan);
          setCustomPlan(p.customPlan);
          setTraces(a.traces);
          setCollectorRuns(a.collectorRuns);
          setWatchtowerDiff(w as WatchtowerResponse | null);
          setForgeReport(fo?.report ?? null);
        }
      } catch (cause) {
        if (live) setError((cause as Error).message);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 2500);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [id]);

  const handleDownloadCbom = async () => {
    try {
      const cbomData = cbom ?? (await api.cbom(id));
      const jsonStr = JSON.stringify(cbomData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ironbastion-${id}-cbom.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setError("Session expired or unauthorized. Please log in again.");
      } else if (cause instanceof ApiError && cause.status === 404) {
        setError("No CBOM available for this scan.");
      } else {
        setError((cause as Error).message);
      }
    }
  };

  const handleOpenReport = async () => {
    try {
      const html = await api.reportHtml(id);
      const blob = new Blob([html], { type: "text/html; charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setError("Session expired or unauthorized. Please log in again.");
      } else if (cause instanceof ApiError && cause.status === 404) {
        setError("Report not found for this scan.");
      } else {
        setError((cause as Error).message);
      }
    }
  };

  if (error) {
    return (
      <div className="banner">
        <b>Could not load this scan</b>
        {error}
      </div>
    );
  }
  if (!detail) return <div className="label">Loading…</div>;

  const { scan, posture } = detail;
  const running = scan.status === "running" || scan.status === "queued";

  const targetObj = scan.targets?.[0] as { name?: string; remoteUrl?: string; ref?: string } | undefined;
  const repoName =
    targetObj?.name ||
    targetObj?.remoteUrl?.split("/").pop()?.replace(/\.git$/, "") ||
    "Repository";
  const branchName = targetObj?.ref || "main";

  const criticalFindingsCount = posture?.counts?.["critical"] ?? findings.filter((f) => f.risk.severity === "critical").length;
  const totalAssetsCount = cbom?.components.length ?? 0;

  const tabLabels: { key: Tab; label: string; count?: number }[] = [
    { key: "findings", label: "Findings", count: findings.length },
    { key: "agents", label: "Agents" },
    { key: "inventory", label: "Inventory", count: totalAssetsCount },
    { key: "plan", label: "Plan" },
    { key: "watchtower", label: "Watchtower" },
    { key: "certify", label: "Certify" },
    { key: "cbom", label: "CBOM", count: totalAssetsCount },
  ];

  return (
    <div className="scan-detail-page">
      {/* Top Scan Header Area */}
      <header className="scan-report-header">
        <div className="header-left">
          <button
            className="back-link-btn"
            type="button"
            onClick={onBack}
          >
            ← Back to Scans
          </button>
          
          <div className="repo-title-row">
            <h1 className="scan-repo-title">
              {repoName} <span className="branch-tag">/ {branchName}</span>
            </h1>
            <span className={`status-badge-pill status-${scan.status}`}>
              {scan.status === "succeeded" ? "✓ Completed" : scan.status === "failed" ? "✕ Failed" : "⏳ Running"}
            </span>
          </div>

          <div className="scan-meta-row">
            <span className="scan-time-text">
              Scanned: {new Date(scan.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {new Date(scan.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
            <span className="dot-sep">•</span>
            <span className="scan-id-subtle">Scan ID: {scan.id}</span>
          </div>
        </div>

        {scan.status === "succeeded" ? (
          <div className="header-actions">
            <button className="btn ghost" type="button" onClick={() => void handleOpenReport()}>
              Report
            </button>
            <button className="btn secondary" type="button" onClick={() => void handleDownloadCbom()}>
              Download CBOM
            </button>
            <button className="btn primary" type="button" onClick={() => setCertifying(true)}>
              Certify Scan
            </button>
          </div>
        ) : null}
      </header>

      {running ? (
        <div className="banner" style={{ marginBottom: 24 }}>
          <b>Scan in progress</b>
          <PhaseTrail phase={scan.phase} status={scan.status} />
        </div>
      ) : null}

      {scan.status === "failed" ? (
        <div className="banner alert-error" style={{ marginBottom: 24 }}>
          <b>Scan failed</b>
          {scan.error ?? "No reason was recorded."}
        </div>
      ) : null}

      {/* 5-Card Security Metric Grid */}
      {(() => {
        const isCase1ZeroAssets = totalAssetsCount === 0 && scan.status === "succeeded";
        const isCase2NoVulnerableFindings = totalAssetsCount > 0 && findings.length === 0 && scan.status === "succeeded";

        const readoutItems = isCase1ZeroAssets
          ? [
              {
                label: "Security Posture",
                value: "N/A",
                sub: "No cryptographic assets detected",
                tone: "var(--dim)",
              },
              {
                label: "Critical Findings",
                value: 0,
                sub: "No security findings",
                tone: "var(--dim)",
              },
              {
                label: "Total Findings",
                value: 0,
                sub: "No security findings",
              },
              {
                label: "Crypto Assets",
                value: 0,
                sub: "No cryptographic usage detected",
                onClick: () => setTab("inventory"),
              },
              {
                label: "Remediation Effort",
                value: "0 days",
                sub: "No remediation required",
              },
            ]
          : isCase2NoVulnerableFindings
          ? [
              {
                label: "Security Posture",
                value: posture ? `${posture.overall} / 100` : "100 / 100",
                sub: "No quantum-vulnerable findings",
                tone: "var(--quantum)",
              },
              {
                label: "Critical Findings",
                value: 0,
                sub: "No critical findings",
                tone: "var(--quantum)",
              },
              {
                label: "Total Findings",
                value: 0,
                sub: "No security findings",
              },
              {
                label: "Crypto Assets",
                value: totalAssetsCount,
                sub: "Cryptographic usage detected",
                onClick: () => setTab("inventory"),
              },
              {
                label: "Remediation Effort",
                value: "0 days",
                sub: "No remediation required",
              },
            ]
          : posture
          ? [
              {
                label: "Security Posture",
                value: `${posture.overall} / 100`,
                sub: `${posture.severity.toUpperCase()} RISK`,
                tone: SEVERITY_TONE[posture.severity],
              },
              {
                label: "Critical Findings",
                value: criticalFindingsCount,
                sub: "Requires attention",
                tone: "var(--critical)",
              },
              {
                label: "Total Findings",
                value: scan.stats.findingsConfirmed,
                sub: `${scan.stats.needsHuman} awaiting review`,
              },
              {
                label: "Crypto Assets",
                value: totalAssetsCount,
                sub: "Click to view Inventory →",
                onClick: () => setTab("inventory"),
              },
              {
                label: "Remediation Effort",
                value: `~${plan?.totalEffortDays ?? 0} days`,
                sub: "AI-assisted estimate",
              },
            ]
          : null;

        return readoutItems ? <Readout items={readoutItems} /> : null;
      })()}

      {/* Risk Spectrum Card */}
      {findings.length > 0 ? <Spectrum findings={findings} onSelect={setSelected} /> : null}

      {/* Main Tab Navigation */}
      <div className="scan-report-tabs">
        {tabLabels.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`report-tab-btn ${tab === item.key ? "active" : ""}`}
            onClick={() => setTab(item.key)}
          >
            <span>{item.label}</span>
            {item.count !== undefined && item.count > 0 ? (
              <span className="tab-count-pill">{item.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "findings" ? (
        running ? (
          <Empty title="Still scanning">
            <p>Findings appear here as soon as the campaign finishes adjudicating them.</p>
          </Empty>
        ) : totalAssetsCount === 0 && scan.status === "succeeded" ? (
          <ZeroCryptoEmptyState collectorRuns={collectorRuns} />
        ) : totalAssetsCount > 0 && findings.length === 0 && scan.status === "succeeded" ? (
          <NoVulnerableFindingsEmptyState
            totalAssetsCount={totalAssetsCount}
            onViewInventory={() => setTab("inventory")}
          />
        ) : findings.length === 0 ? (
          <Empty title="No findings">
            <p>Nothing quantum-vulnerable was confirmed in the targets scanned.</p>
          </Empty>
        ) : (
          <FindingsTable findings={findings} selected={selected} onSelect={setSelected} />
        )
      ) : null}

      {tab === "agents" ? <AgentsView traces={traces} collectorRuns={collectorRuns} /> : null}
      {tab === "inventory" ? <Inventory cbom={cbom} notes={detail.notes} /> : null}
      {tab === "plan" ? (
        <Plan
          scanId={scan.id}
          plan={plan}
          customPlan={customPlan}
          onPlanChange={setCustomPlan}
        />
      ) : null}
      {tab === "watchtower" && detail ? (
        <Watchtower
          projectId={detail.scan.projectId}
          diff={watchtowerDiff}
          onRefresh={async () => {
            const w = await api.watchtower(detail.scan.projectId).catch(() => null);
            setWatchtowerDiff(w as WatchtowerResponse | null);
          }}
        />
      ) : null}
      {tab === "forge" && detail ? (
        <Forge
          scanId={scan.id}
          targets={scan.targets}
          report={forgeReport}
          onReportChange={setForgeReport}
        />
      ) : null}
      {tab === "certify" && detail ? (
        <CertifyView scanDetail={detail} findings={findings} cbom={cbom} />
      ) : null}
      {tab === "cbom" ? (
        <CbomView scanId={scan.id} cbom={cbom} findings={findings} />
      ) : null}

      {certifying && <CertifyModal scanId={scan.id} onClose={() => setCertifying(false)} />}
    </div>
  );
}
