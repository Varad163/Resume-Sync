import { useEffect, useState } from "react";
import type { PqcCertificate } from "@ironbastion/core";
import { api } from "../../../api.js";

export interface CertifyModalProps {
  scanId: string;
  onClose: () => void;
}

export function CertifyModal({ scanId, onClose }: CertifyModalProps) {
  const [cert, setCert] = useState<PqcCertificate | null>(null);
  const [pubKey, setPubKey] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cryptographic Posture Certificate</h2>
          <button className="btn ghost" type="button" onClick={onClose} style={{ minWidth: "auto", padding: "6px 12px" }}>
            ✕
          </button>
        </div>

        {error && <div className="banner"><b>Error generating certificate:</b> {error}</div>}
        
        {!error && !cert && <div className="label" style={{ padding: 20 }}>Generating cryptographic signature…</div>}

        {cert && (
          <>
            <div className="cert-section">
              <h3>Post-Quantum Readiness Assessment</h3>
              <div className="cert-row">
                <div className="lbl">Scan Campaign</div>
                <div className="val">{cert.scanId}</div>
              </div>
              <div className="cert-row">
                <div className="lbl">Project Name</div>
                <div className="val">{cert.project.name}</div>
              </div>
              <div className="cert-row">
                <div className="lbl">Certified At</div>
                <div className="val">{new Date(cert.certifiedAt).toLocaleString()}</div>
              </div>
              <div className="cert-row">
                <div className="lbl">CBOM Hash (SHA-256)</div>
                <div className="val">{cert.cbomHash.substring(0, 16)}...{cert.cbomHash.substring(48)}</div>
              </div>
              <div className="cert-row">
                <div className="lbl">Confirmed Crypto Assets</div>
                <div className="val">{cert.findingsConfirmed} findings</div>
              </div>
              <div className="cert-row accent">
                <div className="lbl" style={{ color: "var(--display)" }}>Overall Posture Score</div>
                <div className="val" style={{ color: cert.posture.overall >= 80 ? "var(--quantum)" : "var(--legacy)", fontWeight: "bold" }}>
                  {cert.posture.overall} / 100
                </div>
              </div>
            </div>

            <div className="cert-section">
              <h3>RSA Signature Verification</h3>
              <div className="cert-row" style={{ flexDirection: "column" }}>
                <div className="lbl">Public Key Verification Block:</div>
                <div className="key-box">{pubKey}</div>
              </div>
              <div className="cert-row" style={{ flexDirection: "column", marginTop: 14 }}>
                <div className="lbl">Cryptographic Signature payload:</div>
                <div className="key-box" style={{ whiteSpace: "normal", wordBreak: "break-all" }}>{cert.signature}</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn ghost" type="button" onClick={copyText}>
                {copied ? "Copied!" : "Copy JSON"}
              </button>
              <button className="btn primary" type="button" onClick={downloadJson}>
                Download JSON
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
