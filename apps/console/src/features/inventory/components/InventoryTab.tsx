import type { CycloneDxBom } from "@ironbastion/cbom";
import { Empty } from "../../../components.js";

export function Inventory({ cbom, notes }: { cbom?: CycloneDxBom; notes: string[] }) {
  if (!cbom) return <Empty title="No inventory yet"><p>The CBOM is assembled when the scan completes.</p></Empty>;

  return (
    <>
      <table className="data">
        <thead>
          <tr>
            <th>Asset</th>
            <th style={{ width: 120 }}>Primitive</th>
            <th style={{ width: 90 }}>PQ level</th>
            <th style={{ width: 90 }}>Uses</th>
            <th style={{ width: 200 }}>Components</th>
          </tr>
        </thead>
        <tbody>
          {cbom.components.map((component) => {
            const properties = Object.fromEntries(
              (component.properties ?? []).map((p) => [p.name, p.value]),
            );
            const level = component.cryptoProperties.algorithmProperties?.nistQuantumSecurityLevel ?? 0;
            return (
              <tr key={component["bom-ref"]}>
                <td>
                  <div className="title">{component.name}</div>
                  <div className="where">{component["bom-ref"]}</div>
                </td>
                <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                  {component.cryptoProperties.algorithmProperties?.primitive ??
                    component.cryptoProperties.assetType}
                </td>
                <td
                  className="mono"
                  style={{ fontSize: 13, color: level === 0 ? "var(--critical)" : "var(--quantum)" }}
                >
                  {level === 0 ? "none" : level}
                </td>
                <td className="mono" style={{ fontSize: 13 }}>
                  {properties["ironbastion:occurrences"] ?? "—"}
                </td>
                <td className="where" style={{ marginTop: 0 }}>
                  {properties["ironbastion:components"] ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {notes.length > 0 ? (
        <div style={{ marginTop: 28 }}>
          <div className="label" style={{ marginBottom: 10 }}>
            Scan notes
          </div>
          <ul style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, paddingLeft: 18 }}>
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
