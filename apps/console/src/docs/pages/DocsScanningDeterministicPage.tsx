export function DocsScanningDeterministicPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Deterministic Rule Engine</h2>
        <p>
          IronBastion features a fully offline, rule-based <b>Deterministic Engine</b> (<code>DETERMINISTIC_MODEL</code>) to guarantee scan reliability when external LLM APIs are unreachable or budget limits are exhausted.
        </p>
      </section>

      <section className="docs-section">
        <h2>Fallback Behaviors</h2>
        <ul>
          <li><b>deterministicAdjudicate</b>: Evaluates candidate rule IDs against pre-indexed algorithm registries to confirm valid cryptographic callsites.</li>
          <li><b>deterministicAssess</b>: Evaluates reachability and data lifetime using static heuristics (e.g. test directory path detection sets <code>reachability: "test-only"</code>).</li>
          <li><b>deterministicPlan</b>: Maps quantum-vulnerable algorithms directly to sanctioned NIST PQC replacement standards (e.g. RSA-2048 &rarr; ML-KEM-768).</li>
        </ul>
      </section>
    </div>
  );
}
