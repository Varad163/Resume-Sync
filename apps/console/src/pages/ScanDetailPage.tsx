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
import { Forge } from "../features/forge/components/ForgeTab.js";
import { Inventory } from "../features/inventory/components/InventoryTab.js";
import { Plan } from "../features/plan/components/PlanTab.js";
import { Watchtower } from "../features/watchtower/components/WatchtowerTab.js";

type Tab = "findings" | "agents" | "inventory" | "plan" | "watchtower" | "forge";

const SEVERITY_TONE: Record<string, string> = {
  critical: "var(--critical)",
  high: "var(--legacy)",
  medium: "var(--legacy)",
  low: "var(--quantum)",
  informational: "var(--dim)",
};

export function ScanView({ id, onBack }: { id: string; onBack: () => void }) {
  const [detail, setDetail] = useState<ScanDetail>();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [cbom, setCbom] = useState<CycloneDxBom>();
  const [plan, setPlan] = useState<MigrationPlan>();
  const [customPlan, setCustomPlan] = useState<MigrationPlan | null>(null);
  const [traces, setTraces] = useState<AgentTrace[]>([]);
  const [collectorRuns, setCollectorRuns] = useState<CollectorRun[]>([]);
  const [tab, setTab] = useState<Tab>("findings");
  const [selected, setSelected] = useState<string>();
  const [error, setError] = useState<string>();
  const [certifying, setCertifying] = useState(false);
  const [watchtowerDiff, setWatchtowerDiff] = useState<WatchtowerResponse | null>(null);
  const [forgeReport, setForgeReport] = useState<ForgeVerificationReport | null>(null);

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

  return (
    <>
      <header className="pagehead">
        <div>
          <button className="label" type="button" onClick={onBack} style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}>
            ← All scans
          </button>
          <h1 className="mono" style={{ fontSize: 22 }}>
            {scan.id}
          </h1>
          <p>
            Started {new Date(scan.startedAt).toLocaleString()}
            {scan.finishedAt ? `, finished ${new Date(scan.finishedAt).toLocaleTimeString()}` : ""}
          </p>
        </div>
        {scan.status === "succeeded" ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost" type="button" onClick={() => void handleOpenReport()}>
              Report
            </button>
            <button className="btn" type="button" onClick={() => void handleDownloadCbom()}>
              Download CBOM
            </button>
            <button className="btn primary" type="button" onClick={() => setCertifying(true)}>
              Certify Scan
            </button>
          </div>
        ) : null}
      </header>

      {running ? (
        <div className="banner">
          <b>Scan in progress</b>
          <PhaseTrail phase={scan.phase} status={scan.status} />
        </div>
      ) : null}

      {scan.status === "failed" ? (
        <div className="banner">
          <b>Scan failed</b>
          {scan.error ?? "No reason was recorded."}
        </div>
      ) : null}

      {posture ? (
        <Readout
          items={[
            {
              label: "Posture",
              value: posture.overall,
              sub: posture.severity.toUpperCase(),
              tone: SEVERITY_TONE[posture.severity],
            },
            { label: "Confirmed", value: scan.stats.findingsConfirmed, sub: "published findings" },
            { label: "Awaiting review", value: scan.stats.needsHuman, sub: "below confidence bar" },
            { label: "Crypto assets", value: cbom?.components.length ?? 0, sub: "in the CBOM" },
            {
              label: "Effort",
              value: plan?.totalEffortDays ?? 0,
              sub: "engineer-days planned",
            },
          ]}
        />
      ) : null}

      {findings.length > 0 ? <Spectrum findings={findings} onSelect={setSelected} /> : null}

      {detail.inventory?.summary ? (
        <p style={{ color: "var(--body)", fontSize: 14, maxWidth: "78ch", marginBottom: 26 }}>
          {detail.inventory.summary}
        </p>
      ) : null}

      <div className="tabs">
        {(["findings", "agents", "inventory", "plan", "watchtower"] as Tab[]).map((name) => (
          <button
            key={name}
            type="button"
            aria-selected={tab === name}
            role="tab"
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === "findings" ? (
        findings.length === 0 ? (
          <Empty title={running ? "Still scanning" : "No findings"}>
            <p>
              {running
                ? "Findings appear here as soon as the campaign finishes adjudicating them."
                : "Nothing quantum-vulnerable was confirmed in the targets scanned."}
            </p>
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

      {certifying && <CertifyModal scanId={scan.id} onClose={() => setCertifying(false)} />}
    </>
  );
}
