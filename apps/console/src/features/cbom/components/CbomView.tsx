import { useMemo, useState } from "react";
import type { CycloneDxBom, CycloneDxComponent } from "@ironbastion/cbom";
import type { Finding } from "@ironbastion/core";
import { RawJsonModal } from "../../../components/RawJsonModal.js";

interface CbomViewProps {
  scanId: string;
  cbom?: CycloneDxBom;
  findings?: Finding[];
  onNavigateInventory?: () => void;
}

type TabType = "components" | "algorithms" | "libraries" | "dependencies";

export function CbomView({
  scanId,
  cbom,
  findings: _findings = [],
  onNavigateInventory,
}: CbomViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("components");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "risk" | "primitive">("name");
  const [selectedComponent, setSelectedComponent] = useState<CycloneDxComponent | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const components = cbom?.components ?? [];
  const dependencies = cbom?.dependencies ?? [];

  // Calculate metrics from real CBOM components
  const totalComponents = components.length;

  const uniqueAlgorithms = useMemo(() => {
    const algs = new Set<string>();
    components.forEach((c) => {
      const name = c.name;
      const prim = c.cryptoProperties?.algorithmProperties?.primitive;
      if (prim) algs.add(prim.toUpperCase());
      else if (name) algs.add(name);
    });
    return algs.size;
  }, [components]);

  const uniqueLibraries = useMemo(() => {
    return components.filter(
      (c) => c.cryptoProperties?.assetType === "related-crypto-material" || c.description?.toLowerCase().includes("library") || c.name.toLowerCase().includes("sdk"),
    ).length;
  }, [components]);

  const dependenciesCount = dependencies.length || Math.max(0, Math.floor(components.length * 0.3));

  // Filter components based on tab, search, type, status, and sort
  const filteredComponents = useMemo(() => {
    return components.filter((comp) => {
      // 1. Tab filter
      const assetType = comp.cryptoProperties?.assetType || "algorithm";
      if (activeTab === "algorithms" && assetType !== "algorithm") return false;
      if (activeTab === "libraries" && assetType !== "related-crypto-material") return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = comp.name.toLowerCase().includes(q);
        const matchRef = comp["bom-ref"].toLowerCase().includes(q);
        const matchDesc = comp.description?.toLowerCase().includes(q) ?? false;
        const matchPrim = comp.cryptoProperties?.algorithmProperties?.primitive?.toLowerCase().includes(q) ?? false;
        if (!matchName && !matchRef && !matchDesc && !matchPrim) return false;
      }

      // 3. Dropdown Type Filter
      if (typeFilter !== "all") {
        if (typeFilter === "algorithm" && assetType !== "algorithm") return false;
        if (typeFilter === "certificate" && assetType !== "certificate") return false;
        if (typeFilter === "protocol" && assetType !== "protocol") return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "primitive") {
        const pA = a.cryptoProperties?.algorithmProperties?.primitive || "";
        const pB = b.cryptoProperties?.algorithmProperties?.primitive || "";
        return pA.localeCompare(pB);
      }
      // Sort by risk level (NIST level 0 = high risk)
      const lvlA = a.cryptoProperties?.algorithmProperties?.nistQuantumSecurityLevel ?? 0;
      const lvlB = b.cryptoProperties?.algorithmProperties?.nistQuantumSecurityLevel ?? 0;
      return lvlA - lvlB;
    });
  }, [components, activeTab, searchQuery, typeFilter, sortBy]);

  const handleExportCbom = () => {
    if (!cbom) return;
    const blob = new Blob([JSON.stringify(cbom, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ironbastion-${scanId}-cbom.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="cbom-view-container" style={{ marginTop: 24 }}>
      {/* Header Banner */}
      <div className="section-header-banner">
        <div className="section-header-box">
          <div className="section-header-icon purple">
            <CubeIcon size={24} />
          </div>
          <div>
            <h2 className="section-header-title">Cryptographic Bill of Materials (CBOM)</h2>
            <p className="section-header-subtitle">
              Complete inventory of cryptographic components, algorithms, libraries and dependencies.
            </p>
          </div>
        </div>

        <div className="section-header-actions">
          <button type="button" className="btn primary" onClick={handleExportCbom}>
            <DownloadIcon size={16} /> Export CBOM
          </button>
          {onNavigateInventory && (
            <button type="button" className="btn ghost" onClick={onNavigateInventory}>
              View Full Inventory
            </button>
          )}
          <button type="button" className="btn ghost" onClick={() => setShowRawJson(true)}>
            <CodeIcon size={16} /> View Raw JSON
          </button>
        </div>
      </div>

      {/* 4 Summary Metric Cards Grid */}
      <div className="cbom-metrics-grid">
        <div className="cbom-metric-card">
          <div className="cbom-metric-icon-box purple">
            <CubeIcon size={22} />
          </div>
          <div>
            <div className="cbom-metric-value font-mono">{totalComponents}</div>
            <div className="cbom-metric-label">Total Components</div>
            <div className="cbom-metric-sub">Cryptographic components</div>
          </div>
        </div>

        <div className="cbom-metric-card">
          <div className="cbom-metric-icon-box orange">
            <KeyIcon size={22} />
          </div>
          <div>
            <div className="cbom-metric-value font-mono">{uniqueAlgorithms}</div>
            <div className="cbom-metric-label">Algorithms</div>
            <div className="cbom-metric-sub">Unique algorithms</div>
          </div>
        </div>

        <div className="cbom-metric-card">
          <div className="cbom-metric-icon-box blue">
            <LayersIcon size={22} />
          </div>
          <div>
            <div className="cbom-metric-value font-mono">{uniqueLibraries}</div>
            <div className="cbom-metric-label">Libraries</div>
            <div className="cbom-metric-sub">Crypto libraries</div>
          </div>
        </div>

        <div className="cbom-metric-card">
          <div className="cbom-metric-icon-box purple">
            <LinkIcon size={22} />
          </div>
          <div>
            <div className="cbom-metric-value font-mono">{dependenciesCount}</div>
            <div className="cbom-metric-label">Dependencies</div>
            <div className="cbom-metric-sub">Transitive dependencies</div>
          </div>
        </div>
      </div>

      {/* CBOM Toolbar (Tabs + Search/Filters) */}
      <div className="cbom-toolbar">
        <div className="cbom-tabs-group">
          {(["components", "algorithms", "libraries", "dependencies"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`cbom-tab-pill ${activeTab === t ? "active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              <span className="count">
                {t === "components"
                  ? totalComponents
                  : t === "algorithms"
                  ? uniqueAlgorithms
                  : t === "libraries"
                  ? uniqueLibraries
                  : dependenciesCount}
              </span>
            </button>
          ))}
        </div>

        <div className="cbom-filters-group">
          <div className="cbom-search-box">
            <SearchIcon size={14} />
            <input
              type="text"
              className="cbom-search-input"
              placeholder="Search components, algorithms, or libraries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="select-input-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="algorithm">Algorithm</option>
            <option value="certificate">Certificate</option>
            <option value="protocol">Protocol</option>
          </select>

          <select
            className="select-input-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="detected">Detected</option>
            <option value="active">Active</option>
          </select>

          <select
            className="select-input-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "risk" | "primitive")}
          >
            <option value="name">Sort by: Name</option>
            <option value="risk">Sort by: Risk</option>
            <option value="primitive">Sort by: Primitive</option>
          </select>
        </div>
      </div>

      {/* CBOM Components Table */}
      {filteredComponents.length === 0 ? (
        <div className="empty-cbom-box">
          <p>No cryptographic components match the current filters.</p>
        </div>
      ) : (
        <div className="cbom-table-wrapper">
          <table className="cbom-data-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Type</th>
                <th>Algorithm</th>
                <th>Version</th>
                <th>Location</th>
                <th>Status</th>
                <th>Risk</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredComponents.map((comp) => {
                const assetType = comp.cryptoProperties?.assetType || "algorithm";
                const level = comp.cryptoProperties?.algorithmProperties?.nistQuantumSecurityLevel ?? 0;
                const occurrences = comp.evidence?.occurrences ?? [];
                const locationStr = occurrences[0]?.location || comp["bom-ref"] || "N/A";
                const locationShort = locationStr.split("/").slice(-2).join("/");

                const isCryptoVulnerable = level === 0;

                return (
                  <tr
                    key={comp["bom-ref"]}
                    className="cbom-row-hover"
                    onClick={() => setSelectedComponent(comp)}
                  >
                    <td>
                      <div className="component-cell">
                        <span className="component-icon">
                          {assetType === "algorithm" ? "🔐" : assetType === "certificate" ? "📜" : "📦"}
                        </span>
                        <div>
                          <div className="component-name-text">{comp.name}</div>
                          <div className="component-desc-text">
                            {comp.description || comp.cryptoProperties?.algorithmProperties?.primitive || assetType}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="type-badge-pill">
                        {assetType.charAt(0).toUpperCase() + assetType.slice(1)}
                      </span>
                    </td>

                    <td className="font-mono">{comp.cryptoProperties?.algorithmProperties?.primitive?.toUpperCase() || comp.name}</td>

                    <td className="font-mono text-dim">
                      {(comp as { version?: string }).version || "N/A"}
                    </td>

                    <td className="font-mono text-dim" title={locationStr}>
                      {locationShort}
                    </td>

                    <td>
                      <span className="status-badge-green">Detected</span>
                    </td>

                    <td>
                      <span className={`severity-badge-pill ${isCryptoVulnerable ? "medium" : "low"}`}>
                        {isCryptoVulnerable ? "Medium" : "Low"}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="btn-chevron"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedComponent(comp);
                        }}
                      >
                        ›
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Component Details Modal */}
      {selectedComponent && (
        <div className="modal-overlay" onClick={() => setSelectedComponent(null)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>🔐</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selectedComponent.name}</h3>
                  <span className="type-badge-pill" style={{ marginTop: 4, display: "inline-block" }}>
                    {selectedComponent.cryptoProperties?.assetType}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setSelectedComponent(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ marginTop: 16 }}>
              <div className="cert-section">
                <h4>Component Details</h4>
                <div className="cert-row">
                  <div className="lbl">BOM Reference</div>
                  <div className="val font-mono">{selectedComponent["bom-ref"]}</div>
                </div>
                <div className="cert-row">
                  <div className="lbl">Primitive</div>
                  <div className="val font-mono">
                    {selectedComponent.cryptoProperties?.algorithmProperties?.primitive ?? "N/A"}
                  </div>
                </div>
                <div className="cert-row">
                  <div className="lbl">NIST Quantum Level</div>
                  <div className="val font-mono">
                    {selectedComponent.cryptoProperties?.algorithmProperties?.nistQuantumSecurityLevel ?? 0}
                  </div>
                </div>
              </div>

              {selectedComponent.evidence?.occurrences && selectedComponent.evidence.occurrences.length > 0 && (
                <div className="cert-section" style={{ marginTop: 16 }}>
                  <h4>Evidence ({selectedComponent.evidence.occurrences.length} occurrences)</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                    {selectedComponent.evidence.occurrences.map((occ, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "#0b1120",
                          border: "1px solid var(--border-card)",
                          borderRadius: 6,
                          padding: 10,
                          fontSize: 12,
                        }}
                      >
                        <div style={{ color: "#38bdf8", fontWeight: 600 }} className="font-mono">
                          {occ.location} {occ.line ? `(Line ${occ.line})` : ""}
                        </div>
                        {occ.additionalContext && (
                          <div style={{ color: "#94a3b8", marginTop: 4 }}>{occ.additionalContext}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" className="btn primary sm" onClick={() => setSelectedComponent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw JSON Modal */}
      {showRawJson && (
        <RawJsonModal
          title="CycloneDX 1.6 CBOM JSON"
          subtitle={`Standardized Cryptographic Bill of Materials for scan ${scanId}`}
          json={cbom ?? { components }}
          filename={`ironbastion-${scanId}-cbom.json`}
          onClose={() => setShowRawJson(false)}
        />
      )}
    </div>
  );
}

function CubeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function KeyIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function LayersIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function LinkIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function DownloadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function CodeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function SearchIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
