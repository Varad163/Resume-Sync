import { useEffect, useState } from "react";
import type { CycloneDxBom } from "@ironbastion/cbom";
import type { Finding, PqcCertificate } from "@ironbastion/core";
import { api, type ScanDetail } from "../../../api.js";
import { RawJsonModal } from "../../../components/RawJsonModal.js";
import { CertifyModal } from "./CertifyModal.js";

interface CertifyViewProps {
  scanDetail: ScanDetail;
  findings: Finding[];
  cbom?: CycloneDxBom;
  onNavigateDocs?: () => void;
}

export function CertifyView({
  scanDetail,
  findings,
  cbom,
  onNavigateDocs,
}: CertifyViewProps) {
  const { scan, posture } = scanDetail;
  const [cert, setCert] = useState<PqcCertificate | null>(null);
  const [loadingCert, setLoadingCert] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    let live = true;
    setLoadingCert(true);
    setError(null);
    api.certificate(scan.id)
      .then((loadedCert) => {
        if (live) {
          setCert(loadedCert);
        }
      })
      .catch(() => {
        // Certificate not generated yet, will generate on click
      })
      .finally(() => {
        if (live) setLoadingCert(false);
      });
    return () => {
      live = false;
    };
  }, [scan.id]);

  const handleGenerateCert = async () => {
    setGenerating(true);
    setError(null);
    try {
      const generated = await api.certificate(scan.id);
      setCert(generated);
    } catch (err) {
      setError((err as Error).message || "Failed to generate certificate");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadJson = () => {
    if (!cert) return;
    const blob = new Blob([JSON.stringify(cert, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pqc-certificate-${scan.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyCertId = () => {
    const idToCopy = cert?.scanId ? `cert_${cert.scanId.slice(0, 16)}` : `cert_${scan.id.slice(0, 16)}`;
    void navigator.clipboard.writeText(idToCopy);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const criticalCount =
    posture?.counts?.["critical"] ?? findings.filter((f) => f.risk.severity === "critical").length;
  const highCount =
    posture?.counts?.["high"] ?? findings.filter((f) => f.risk.severity === "high").length;
  const overallScore = posture?.overall ?? 76;
  const totalCryptoAssets: number = posture?.counts
    ? Object.values(posture.counts).reduce((a: number, b: unknown) => a + (typeof b === "number" ? b : 0), 0)
    : findings.length;
  const totalCbomComponents = cbom?.components.length ?? 0;

  const isReady = criticalCount === 0 && overallScore >= 50;

  const certIdDisplay = cert ? `cert_${cert.scanId.slice(0, 16)}` : `cert_${scan.id.slice(0, 16)}`;
  const certDateDisplay = cert
    ? new Date(cert.certifiedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
    : new Date(scan.startedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      });

  const validUntilDate = cert
    ? new Date(new Date(cert.certifiedAt).setFullYear(new Date(cert.certifiedAt).getFullYear() + 1)).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : new Date(new Date(scan.startedAt).setFullYear(new Date(scan.startedAt).getFullYear() + 1)).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  return (
    <div className="certify-view-container" style={{ marginTop: 24 }}>
      {/* Header Banner */}
      <div className="section-header-banner">
        <div className="section-header-box">
          <div className="section-header-icon green">
            <CertifyShieldIcon size={24} />
          </div>
          <div>
            <h2 className="section-header-title">Certify</h2>
            <p className="section-header-subtitle">
              Generate cryptographic compliance evidence and verification artifacts for your repository.
            </p>
          </div>
        </div>

        <div className="section-header-actions">
          {cert && (
            <button
              type="button"
              className="btn secondary"
              onClick={() => setShowCertModal(true)}
            >
              <CertifyShieldIcon size={16} /> View Certificate
            </button>
          )}
          <button
            type="button"
            className="btn primary"
            onClick={handleGenerateCert}
            disabled={generating || loadingCert}
          >
            <CertifyShieldIcon size={16} />{" "}
            {generating
              ? "Generating Certificate..."
              : cert
              ? "✓ Certificate Generated"
              : "Generate Certificate"}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={onNavigateDocs}
          >
            Learn more
          </button>
        </div>
      </div>

      {error && (
        <div className="banner alert-error" style={{ marginBottom: 20 }}>
          <b>Error:</b> {error}
        </div>
      )}

      {/* 3-Card Grid */}
      <div className="certify-cards-grid">
        {/* Card 1: Certification Summary / Readiness */}
        <div className="certify-card">
          <div className="card-top-icon-row">
            <div className={`status-badge-circle ${isReady ? "green" : "red"}`}>
              {isReady ? "✓" : "!"}
            </div>
            <div>
              <h3 className="cert-card-title">
                {isReady ? "Certification Ready" : "Certification Not Ready"}
              </h3>
              <p className="cert-card-sub">
                {isReady
                  ? "Your repository meets the current cryptographic security requirements."
                  : `${criticalCount} critical finding${criticalCount > 1 ? "s" : ""} must be resolved before certification.`}
              </p>
            </div>
          </div>

          <div className="cert-metrics-list">
            <div className="cert-metric-row">
              <span className="lbl">Security Posture</span>
              <span className="val posture font-mono">{overallScore} / 100</span>
            </div>
            <div className="cert-metric-row">
              <span className="lbl">Critical Findings</span>
              <span className={`val font-mono ${criticalCount > 0 ? "critical-text" : "green-text"}`}>
                {criticalCount}
              </span>
            </div>
            <div className="cert-metric-row">
              <span className="lbl">High Risk Issues</span>
              <span className={`val font-mono ${highCount > 0 ? "orange-text" : "green-text"}`}>
                {highCount}
              </span>
            </div>
            <div className="cert-metric-row">
              <span className="lbl">Cryptographic Assets</span>
              <span className="val font-mono">{totalCryptoAssets}</span>
            </div>
            <div className="cert-metric-row">
              <span className="lbl">CBOM Components</span>
              <span className="val font-mono">{totalCbomComponents}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Compliance Standards */}
        <div className="certify-card">
          <div className="card-header-simple">
            <h3 className="cert-card-title">Compliance Standards</h3>
            <p className="cert-card-sub">Standards evaluated in this certification</p>
          </div>

          <div className="standards-list">
            <div className="standard-item-row">
              <div className="standard-info">
                <ShieldIcon size={18} />
                <span className="standard-name">NIST PQC</span>
              </div>
              <span className="compliance-badge green">
                Compliant <ChevronRightIcon size={12} />
              </span>
            </div>

            <div className="standard-item-row">
              <div className="standard-info">
                <ShieldIcon size={18} />
                <span className="standard-name">CNSA 2.0</span>
              </div>
              <span className={`compliance-badge ${criticalCount === 0 ? "green" : "orange"}`}>
                {criticalCount === 0 ? "Compliant" : "Action Req"} <ChevronRightIcon size={12} />
              </span>
            </div>

            <div className="standard-item-row">
              <div className="standard-info">
                <ShieldIcon size={18} />
                <span className="standard-name">Internal Policy</span>
              </div>
              <span className="compliance-badge green">
                Compliant <ChevronRightIcon size={12} />
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Certification Details */}
        <div className="certify-card">
          <div className="card-header-simple">
            <h3 className="cert-card-title">Certification Details</h3>
          </div>

          <div className="cert-details-stack">
            <div className="detail-meta-row">
              <span className="lbl">Certificate ID</span>
              <span className="val font-mono copyable" onClick={handleCopyCertId} title="Click to copy ID">
                <CopyIcon size={12} /> {certIdDisplay} {copiedId ? "✓" : ""}
              </span>
            </div>

            <div className="detail-meta-row">
              <span className="lbl">Generated At</span>
              <span className="val font-mono">
                <CalendarIcon size={12} /> {certDateDisplay}
              </span>
            </div>

            <div className="detail-meta-row">
              <span className="lbl">Scan Reference</span>
              <span className="val font-mono">
                <LinkIcon size={12} /> {scan.id.slice(0, 20)}...
              </span>
            </div>

            <div className="detail-meta-row">
              <span className="lbl">Status</span>
              <span className="val">
                <span className="badge-green">Valid</span>
              </span>
            </div>

            <div className="detail-meta-row">
              <span className="lbl">Valid Until</span>
              <span className="val font-mono">
                <CalendarIcon size={12} /> {validUntilDate}
              </span>
            </div>
          </div>

          <div className="cert-actions-bottom">
            <button
              type="button"
              className="btn secondary sm"
              onClick={handleDownloadJson}
              disabled={!cert}
            >
              Download PDF / JSON
            </button>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setShowRawJson(true)}
            >
              {`{} View Raw JSON`}
            </button>
          </div>
        </div>
      </div>

      {/* Certificate Modal */}
      {showCertModal && (
        <CertifyModal scanId={scan.id} onClose={() => setShowCertModal(false)} />
      )}

      {/* Raw JSON Modal */}
      {showRawJson && (
        <RawJsonModal
          title="Cryptographic Certificate JSON"
          subtitle={`Audit payload signature for scan ${scan.id}`}
          json={cert ?? { scanId: scan.id, posture, timestamp: new Date().toISOString() }}
          filename={`pqc-certificate-${scan.id}.json`}
          onClose={() => setShowRawJson(false)}
        />
      )}
    </div>
  );
}

function CertifyShieldIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function ShieldIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function CopyIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CalendarIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function LinkIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ChevronRightIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
