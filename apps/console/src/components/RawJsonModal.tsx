import { useState } from "react";

interface RawJsonModalProps {
  title: string;
  subtitle?: string;
  json: unknown;
  filename?: string;
  onClose: () => void;
}

export function RawJsonModal({
  title,
  subtitle = "Raw JSON Payload artifact",
  json,
  filename = "artifact.json",
  onClose,
}: RawJsonModalProps) {
  const [copied, setCopied] = useState(false);

  const formattedJson = JSON.stringify(json, null, 2);

  const handleCopy = () => {
    void navigator.clipboard.writeText(formattedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([formattedJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-window raw-json-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 850, width: "90vw", maxHeight: "85vh", display: "flex", flexDirection: "column" }}
      >
        <div className="modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-white)" }}>{title}</h3>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)" }}>{subtitle}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" className="btn ghost sm" onClick={handleCopy}>
              {copied ? "Copied! ✓" : "Copy JSON"}
            </button>
            <button type="button" className="btn primary sm" onClick={handleDownload}>
              Download JSON
            </button>
            <button
              type="button"
              className="btn ghost sm"
              onClick={onClose}
              style={{ minWidth: "auto", padding: "4px 8px", fontSize: 16 }}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ flex: 1, overflow: "auto", marginTop: 16 }}>
          <pre
            className="code-block-json font-mono"
            style={{
              background: "#080c14",
              border: "1px solid var(--border-card)",
              borderRadius: 8,
              padding: 16,
              fontSize: 12,
              lineHeight: 1.5,
              color: "#38bdf8",
              overflow: "auto",
              maxHeight: "55vh",
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {formattedJson}
          </pre>
        </div>
      </div>
    </div>
  );
}
