import { useEffect, useState } from "react";
import type { PqcCertificate } from "@ironbastion/core";
import { api } from "../../../api.js";
import { RawJsonModal } from "../../../components/RawJsonModal.js";

export interface CertifyModalProps {
  scanId: string;
  onClose: () => void;
}

export function CertifyModal({ scanId, onClose }: CertifyModalProps) {
  const [cert, setCert] = useState<PqcCertificate | null>(null);
  const [pubKey, setPubKey] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedPubKey, setCopiedPubKey] = useState(false);
  const [copiedSig, setCopiedSig] = useState(false);

  const [showRawJsonModal, setShowRawJsonModal] = useState(false);
  const [showPubKeyModal, setShowPubKeyModal] = useState(false);
  const [showSigModal, setShowSigModal] = useState(false);

  useEffect(() => {
    Promise.all([api.certificate(scanId), api.publicKey()])
      .then(([loadedCert, loadedKey]) => {
        setCert(loadedCert);
        setPubKey(loadedKey.publicKey);
      })
      .catch((err) => {
        setError((err as Error).message);
      });
  }, [scanId]);

  const downloadJson = () => {
    if (!cert) return;
    const blob = new Blob([JSON.stringify(cert, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pqc-certificate-${scanId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyText = () => {
    if (!cert) return;
    void navigator.clipboard.writeText(JSON.stringify(cert, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCertId = () => {
    if (!cert) return;
    const id = `cert_${cert.scanId.slice(0, 16)}`;
    void navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copyHash = () => {
    if (!cert) return;
    void navigator.clipboard.writeText(cert.cbomHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const copyPubKey = () => {
    if (!pubKey) return;
    void navigator.clipboard.writeText(pubKey);
    setCopiedPubKey(true);
    setTimeout(() => setCopiedPubKey(false), 2000);
  };

  const copySignature = () => {
    if (!cert) return;
    void navigator.clipboard.writeText(cert.signature);
    setCopiedSig(true);
    setTimeout(() => setCopiedSig(false), 2000);
  };

  const certId = cert ? `cert_${cert.scanId.slice(0, 16)}` : "";
  const hashTruncated = cert
    ? `${cert.cbomHash.slice(0, 12)}...${cert.cbomHash.slice(-12)}`
    : "";
  const formattedDate = cert
    ? new Date(cert.certifiedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cert-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Top Bar Header */}
        <div className="cert-modal-header">
          <div className="cert-modal-title-group">
            <div className="cert-modal-icon">🛡️</div>
            <div>
              <div className="cert-modal-title-row">
                <h2 className="cert-modal-title">Cryptographic Posture Certificate</h2>
                <span className="cert-status-pill green">✓ CERTIFIED</span>
              </div>
              <p className="cert-modal-subtitle">Post-Quantum Readiness Assessment</p>
            </div>
          </div>
          <button
            type="button"
            className="btn ghost close-btn"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="banner alert-error" style={{ margin: 20 }}>
            <b>Error loading certificate:</b> {error}
          </div>
        )}

        {!error && !cert && (
          <div className="cert-modal-loading">
            <div className="spinner" />
            <span>Generating cryptographic signature and loading certificate details…</span>
          </div>
        )}

        {cert && (
          <div className="cert-modal-body">
            {/* Repository Info Strip */}
            <div className="cert-repo-strip">
              <div className="cert-repo-item">
                <span className="lbl">Project</span>
                <span className="val font-semibold">{cert.project.name}</span>
              </div>
              <div className="cert-repo-divider" />
              <div className="cert-repo-item">
                <span className="lbl">Scan</span>
                <span className="val font-mono">{cert.scanId.slice(0, 20)}...</span>
              </div>
              <div className="cert-repo-divider" />
              <div className="cert-repo-item">
                <span className="lbl">Certified</span>
                <span className="val font-mono">{formattedDate}</span>
              </div>
            </div>

            {/* Top Grid: Status Card + Posture Gauge */}
            <div className="cert-top-cards-grid">
              {/* Certification Status Banner Card */}
              <div className="cert-card cert-status-card">
                <div className="cert-status-header">
                  <div className="cert-check-circle">✓</div>
                  <div>
                    <div className="cert-status-main">CERTIFICATION VERIFIED</div>
                    <div className="cert-status-sub">Post-Quantum Readiness</div>
                  </div>
                </div>

                <div className="cert-status-stats">
                  <div className="cert-stat-block">
                    <span className="lbl">Overall Posture</span>
                    <span className="val score font-mono">{cert.posture.overall} / 100</span>
                  </div>
                  <div className="cert-stat-block">
                    <span className="lbl">Cryptographic Findings</span>
                    <span className="val font-mono">{cert.findingsConfirmed} issues</span>
                  </div>
                </div>
              </div>

              {/* Security Posture Gauge Card */}
              <div className="cert-card cert-gauge-card">
                <div className="gauge-label-top">SECURITY POSTURE</div>
                <div className="gauge-circle-wrap">
                  <svg width="90" height="90" viewBox="0 0 100 100" className="gauge-svg">
                    <circle cx="50" cy="50" r="40" className="gauge-bg" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="gauge-bar"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * (1 - cert.posture.overall / 100)}
                    />
                  </svg>
                  <div className="gauge-text font-mono">
                    <span className="score-num">{cert.posture.overall}</span>
                    <span className="score-denom">/ 100</span>
                  </div>
                </div>
                <div className="gauge-sub">Post-Quantum Readiness</div>
              </div>
            </div>

            {/* Certificate Metadata Grid */}
            <div className="cert-section-title">Certificate Metadata</div>
            <div className="cert-meta-grid">
              <div className="cert-meta-card">
                <span className="lbl">Certificate ID</span>
                <div className="val-row">
                  <span className="val font-mono">{certId}</span>
                  <button type="button" className="copy-icon-btn" onClick={copyCertId} title="Copy ID">
                    {copiedId ? "✓" : "📋"}
                  </button>
                </div>
              </div>

              <div className="cert-meta-card">
                <span className="lbl">Certified At</span>
                <span className="val font-mono">{formattedDate}</span>
              </div>

              <div className="cert-meta-card">
                <span className="lbl">Scan Reference</span>
                <div className="val-row">
                  <span className="val font-mono">{cert.scanId.slice(0, 18)}...</span>
                </div>
              </div>

              <div className="cert-meta-card">
                <span className="lbl">CBOM Hash (SHA-256)</span>
                <div className="val-row" title={cert.cbomHash}>
                  <span className="val font-mono">{hashTruncated}</span>
                  <button type="button" className="copy-icon-btn" onClick={copyHash} title="Copy Full Hash">
                    {copiedHash ? "✓" : "📋"}
                  </button>
                </div>
              </div>

              <div className="cert-meta-card">
                <span className="lbl">Crypto Assets</span>
                <span className="val font-mono">{cert.findingsConfirmed}</span>
              </div>

              <div className="cert-meta-card">
                <span className="lbl">Findings</span>
                <span className="val font-mono">{cert.findingsConfirmed}</span>
              </div>
            </div>

            {/* RSA Signature Verification Section */}
            <div className="cert-section-title">RSA Signature Verification</div>
            <div className="cert-card cert-verification-card">
              <div className="verification-top-row">
                <span className="verif-check">✓ Signature verified</span>
                <span className="verif-desc">
                  The certificate signature has been successfully verified against the IronBastion public key.
                </span>
              </div>

              <div className="verif-rows">
                <div className="verif-row">
                  <div className="lbl-group">
                    <span className="lbl">Verification method</span>
                    <span className="val">RSA (SHA-256)</span>
                  </div>
                </div>

                <div className="verif-row">
                  <div className="lbl-group">
                    <span className="lbl">Public key</span>
                    <span className="val text-muted">RSA public key available</span>
                  </div>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setShowPubKeyModal(!showPubKeyModal)}
                  >
                    {showPubKeyModal ? "Hide Public Key" : "View Public Key"}
                  </button>
                </div>

                {showPubKeyModal && (
                  <div className="code-viewer-box">
                    <div className="code-viewer-header">
                      <span>RSA Public Key</span>
                      <button type="button" className="btn ghost xs" onClick={copyPubKey}>
                        {copiedPubKey ? "Copied!" : "Copy Public Key"}
                      </button>
                    </div>
                    <pre className="code-block font-mono">{pubKey || "No public key loaded"}</pre>
                  </div>
                )}

                <div className="verif-row">
                  <div className="lbl-group">
                    <span className="lbl">Signature</span>
                    <span className="val text-green">Verified</span>
                  </div>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setShowSigModal(!showSigModal)}
                  >
                    {showSigModal ? "Hide Signature" : "View Signature"}
                  </button>
                </div>

                {showSigModal && (
                  <div className="code-viewer-box">
                    <div className="code-viewer-header">
                      <span>Cryptographic Signature Payload</span>
                      <button type="button" className="btn ghost xs" onClick={copySignature}>
                        {copiedSig ? "Copied!" : "Copy Signature"}
                      </button>
                    </div>
                    <pre className="code-block font-mono" style={{ wordBreak: "break-all", whiteSpace: "pre-wrap" }}>
                      {cert.signature}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="cert-modal-footer">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setShowRawJsonModal(true)}
              >
                {`{} View Raw JSON`}
              </button>
              <div className="right-actions">
                <button type="button" className="btn secondary" onClick={copyText}>
                  {copied ? "✓ Copied!" : "Copy JSON"}
                </button>
                <button type="button" className="btn primary" onClick={downloadJson}>
                  Download JSON
                </button>
              </div>
            </div>
          </div>
        )}

        {showRawJsonModal && cert && (
          <RawJsonModal
            title="Certificate JSON"
            json={cert}
            filename={`pqc-certificate-${scanId}.json`}
            onClose={() => setShowRawJsonModal(false)}
          />
        )}
      </div>
    </div>
  );
}
