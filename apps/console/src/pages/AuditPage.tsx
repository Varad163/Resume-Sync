import { useEffect, useState } from "react";
import { api, type AuditEntry } from "../api.js";
import { Empty } from "../components.js";

export function Activity() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void api
      .audit()
      .then(({ entries: loaded }) => setEntries(loaded))
      .catch((cause: Error) => setError(cause.message));
  }, []);

  return (
    <>
      <header className="pagehead">
        <div>
          <div className="label">Audit</div>
          <h1>Activity</h1>
          <p>Every scan, project change and completion, with who did it and when.</p>
        </div>
      </header>

      {error ? (
        <div className="banner">
          <b>Could not load activity</b>
          {error}
        </div>
      ) : null}

      {entries.length === 0 ? (
        <Empty title="Nothing recorded yet">
          <p>Activity appears here as soon as someone creates a project or runs a scan.</p>
        </Empty>
      ) : (
        <table className="data">
          <thead>
            <tr>
              <th style={{ width: 190 }}>When</th>
              <th style={{ width: 160 }}>Action</th>
              <th style={{ width: 220 }}>Actor</th>
              <th>Subject</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={`${entry.at}-${index}`}>
                <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                  {new Date(entry.at).toLocaleString()}
                </td>
                <td className="mono" style={{ fontSize: 12, color: "var(--quantum)" }}>
                  {entry.action}
                </td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {entry.actor}
                </td>
                <td className="mono" style={{ fontSize: 11, color: "var(--dim)" }}>
                  {entry.subject}
                  {Object.keys(entry.detail ?? {}).length > 0
                    ? ` · ${JSON.stringify(entry.detail)}`
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
