import { useState } from "react";
import type { ForgeVerificationReport, ScanTarget } from "@ironbastion/core";
import { api } from "../../../api.js";
import { Empty } from "../../../components.js";

export interface ForgeProps {
  scanId: string;
  targets: readonly ScanTarget[];
  report: ForgeVerificationReport | null;
  onReportChange: (report: ForgeVerificationReport) => void;
}

export function Forge({ scanId, targets, report, onReportChange }: ForgeProps) {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string>();

  const tlsTargets = (targets || []).filter((t: ScanTarget) => t.kind === "tls-endpoint");

  const handleVerify = async () => {
    setVerifying(true);
    setError(undefined);
    try {
      const res = await api.checkForge(scanId);
      onReportChange(res.report);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  if (tlsTargets.length === 0) {
    return (
      <Empty title="Static Targets Only">
        <p>FORGE active handshake validation is designed for remote network TLS/PQC endpoints.</p>
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--muted)" }}>
          No network-accessible targets are configured for this project.
        </p>
      </Empty>
    );
  }

  const firstTarget = tlsTargets[0]!;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, background: "var(--raised)", padding: "14px 20px", border: "1px solid var(--edge)" }}>
        <div>
          <span className="label" style={{ marginRight: 12 }}>Active Probing:</span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            Target: {firstTarget.host}:{firstTarget.port || 443}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {error && <span style={{ color: "var(--critical)", fontSize: 12 }}>{error}</span>}
          <button
            className="btn primary"
            type="button"
            disabled={verifying}
            onClick={handleVerify}
            style={{ padding: "6px 12px", minWidth: "auto" }}
          >
            {verifying ? "Probing..." : report ? "Re-Run Verification" : "Trigger Validation"}
          </button>
        </div>
      </div>

      {!report && !verifying && (
        <Empty title="Verification Pending">
          <p>Handshake and implementation checks have not been executed for this endpoint yet.</p>
          <button
            className="btn primary"
            type="button"
            onClick={handleVerify}
            style={{ marginTop: 16 }}
          >
            Run Cryptographic Handshake Probe
          </button>
        </Empty>
      )}

      {verifying && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 40, background: "var(--raised)", border: "1px solid var(--edge)" }}>
          <div className="label" style={{ animation: "pulse 1.5s infinite" }}>Executing dynamic handshake tests...</div>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 12 }}>Offering PQ hybrids, testing cipher downgrade, and verifying parameter curves.</p>
        </div>
      )}

      {report && !verifying && (
        <>
          {report.overallStatus === "verified" && (
            <div style={{ padding: "16px 20px", marginBottom: 24, borderLeft: "4px solid var(--quantum)", background: "rgba(63, 208, 227, 0.08)" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: 16, color: "var(--quantum)" }}>Validation Passed</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>All standard handshakes, negative curve injections, and parameter checks completed successfully.</p>
            </div>
          )}
          {report.overallStatus === "insecure" && (
            <div style={{ padding: "16px 20px", marginBottom: 24, borderLeft: "4px solid var(--legacy)", background: "rgba(233, 142, 85, 0.08)" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: 16, color: "var(--legacy)" }}>Insecure Configuration</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>The server operates correctly, but supports legacy curves or protocol fallbacks vulnerable to downgrade attacks.</p>
            </div>
          )}
          {report.overallStatus === "broken" && (
            <div style={{ padding: "16px 20px", marginBottom: 24, borderLeft: "4px solid var(--critical)", background: "rgba(233, 85, 85, 0.08)" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: 16, color: "var(--critical)" }}>Security Defect Detected</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>One or more critical validation tests (such as invalid key exchange parameter rejection) failed.</p>
            </div>
          )}
          {report.overallStatus === "failed" && (
            <div style={{ padding: "16px 20px", marginBottom: 24, borderLeft: "4px solid var(--dim)", background: "var(--raised)" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: 16, color: "var(--body)" }}>Connection Refused</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Unable to establish initial TLS connection or socket handshake timed out.</p>
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <div className="label" style={{ marginBottom: 12 }}>Handshake & Implementation Checks</div>
            <table className="data">
              <thead>
                <tr>
                  <th>Verification Test</th>
                  <th style={{ width: 140 }}>Target Type</th>
                  <th style={{ width: 140 }}>Severity</th>
                  <th style={{ width: 120 }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {report.checks.map((check) => (
                  <tr key={check.id}>
                    <td>
                      <div className="title">{check.name}</div>
                      <div className="where">{check.description}</div>
                      {check.logs && check.logs.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 12, fontFamily: "monospace", color: check.status === "pass" ? "var(--quantum)" : "var(--critical)" }}>
                          {check.logs.join(" | ")}
                        </div>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>active</td>
                    <td className="mono" style={{ fontSize: 12, color: check.status === "fail" ? "var(--critical)" : "var(--muted)" }}>
                      {check.severity.toUpperCase()}
                    </td>
                    <td className="mono" style={{ fontSize: 12, fontWeight: "bold", color: check.status === "pass" ? "var(--quantum)" : "var(--critical)" }}>
                      {check.status.toUpperCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {report.traces && report.traces.length > 0 && (
            <div style={{ marginTop: 36 }}>
              <div className="label" style={{ marginBottom: 12 }}>Handshake Protocol Execution Trace</div>
              <div style={{ background: "var(--raised)", padding: 20, fontFamily: "monospace", fontSize: 13, border: "1px solid var(--edge)", maxHeight: 300, overflowY: "auto" }}>
                {report.traces.map((step, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 16, marginBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: 6 }}>
                    <span style={{ color: "var(--muted)", width: 90 }}>{new Date(step.timestamp).toLocaleTimeString()}</span>
                    <span style={{
                      color: step.status === "error" ? "var(--critical)" : step.status === "warning" ? "var(--legacy)" : "var(--quantum)",
                      width: 120,
                      fontWeight: "bold"
                    }}>
                      [{step.name.toUpperCase()}]
                    </span>
                    <span style={{ color: "var(--display)" }}>{step.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
