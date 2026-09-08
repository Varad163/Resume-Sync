import type { CollectorRun } from "../../../api.js";

export function formatCollectorName(id: string): string {
  const normalized = id.toLowerCase().trim();
  switch (normalized) {
    case "jvm-source":
      return "JVM Source";
    case "jvm-dependencies":
    case "jvm-deps":
      return "JVM Dependencies";
    case "python-source":
      return "Python Source";
    case "python-dependencies":
    case "python-deps":
      return "Python Dependencies";
    case "js-source":
    case "javascript-source":
      return "JavaScript / TypeScript";
    case "npm-dependencies":
    case "npm-deps":
      return "NPM Dependencies";
    case "tls-endpoint":
    case "tls":
      return "TLS Endpoint";
    case "git-repository":
    case "git-source":
      return "Git Repository Scanner";
    case "zip-archive":
      return "ZIP Archive Scanner";
    default:
      return id
        .split(/[-_]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
  }
}

export const DEFAULT_COLLECTORS = [
  "JVM Source",
  "JVM Dependencies",
  "Python Source",
  "Python Dependencies",
  "JavaScript / TypeScript",
  "NPM Dependencies",
  "TLS Endpoint",
];

export function getScanCoverageList(collectorRuns: CollectorRun[]): string[] {
  if (collectorRuns && collectorRuns.length > 0) {
    const uniqueIds = [...new Set(collectorRuns.map((r) => r.collectorId))];
    return uniqueIds.map(formatCollectorName);
  }
  return DEFAULT_COLLECTORS;
}

export function ZeroCryptoEmptyState({
  collectorRuns = [],
}: {
  collectorRuns?: CollectorRun[];
}) {
  const coverageList = getScanCoverageList(collectorRuns);

  return (
    <div className="zero-crypto-empty-state" style={{ marginTop: 24 }}>
      <div
        className="card"
        style={{
          background: "var(--raised)",
          border: "1px solid var(--edge)",
          borderRadius: 8,
          padding: 32,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1,
              background: "rgba(59, 130, 246, 0.1)",
              color: "var(--quantum)",
              padding: "10px 14px",
              borderRadius: 6,
              border: "1px solid rgba(59, 130, 246, 0.2)",
            }}
          >
            🔍
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px 0", color: "var(--display)" }}>
              No cryptographic usage detected
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
              IronBastion scanned this repository but did not identify executable cryptographic operations, cryptographic dependencies, or TLS endpoints.
            </p>
          </div>
        </div>

        <div
          style={{
            background: "var(--bg)",
            border: "1px solid var(--edge)",
            borderRadius: 6,
            padding: "12px 16px",
            color: "var(--dim)",
            fontSize: 13,
            lineHeight: 1.5,
            marginTop: 16,
          }}
        >
          <span style={{ color: "var(--quantum)", fontWeight: 600 }}>Note:</span> Cryptography mentioned only in README files, documentation, comments, or reference lists is not counted as active cryptographic usage.
        </div>

        {/* SCAN COVERAGE SECTION */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--edge)" }}>
          <h4
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: 14,
            }}
          >
            Scan Coverage
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {coverageList.map((name) => (
              <div
                key={name}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--bg)",
                  border: "1px solid var(--edge)",
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 13,
                  color: "var(--display)",
                }}
              >
                <span style={{ color: "var(--quantum)", fontWeight: 700 }}>✓</span>
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NoVulnerableFindingsEmptyState({
  totalAssetsCount,
  onViewInventory,
}: {
  totalAssetsCount: number;
  onViewInventory: () => void;
}) {
  return (
    <div className="no-vulnerable-findings-empty-state" style={{ marginTop: 24 }}>
      <div
        className="card"
        style={{
          background: "var(--raised)",
          border: "1px solid var(--edge)",
          borderRadius: 8,
          padding: 32,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1,
              background: "rgba(16, 185, 129, 0.1)",
              color: "var(--quantum)",
              padding: "10px 14px",
              borderRadius: 6,
              border: "1px solid rgba(16, 185, 129, 0.2)",
            }}
          >
            🛡️
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px 0", color: "var(--display)" }}>
              Cryptographic usage detected
            </h2>
            <p style={{ margin: "0 0 8px 0", color: "var(--quantum)", fontSize: 15, fontWeight: 600 }}>
              No confirmed quantum-vulnerable findings
            </p>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
              IronBastion identified {totalAssetsCount} cryptographic asset{totalAssetsCount === 1 ? "" : "s"} in this target, but none were confirmed to be quantum-vulnerable.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            className="btn secondary"
            onClick={onViewInventory}
          >
            View Cryptographic Inventory ({totalAssetsCount} asset{totalAssetsCount === 1 ? "" : "s"}) →
          </button>
        </div>
      </div>
    </div>
  );
}
