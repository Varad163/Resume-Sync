export function DocsDevelopmentStructurePage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Monorepo Directory Layout</h2>
        <div className="docs-code-block">
          <pre>{`IronBastion/
├── apps/
│   ├── api/             # Fastify REST API server
│   ├── cli/             # Local terminal scanner tool
│   ├── console/         # Vite + React web application & docs
│   └── worker/          # SQS queue background runner
├── packages/
│   ├── agents/          # Agentic AI subagent prompts & logic
│   ├── cbom/            # CycloneDX 1.6 CBOM schema & generator
│   ├── collectors/      # JVM, Node, Python, TLS static collectors
│   ├── core/            # Core domain types & migration simulator
│   ├── db/              # SQLite / Postgres repository layer
│   ├── risk/            # Quantum vulnerability scoring engine
│   └── runner/          # Scan queue & execution pipeline
├── infra/               # AWS CDK infrastructure stacks
└── fixtures/            # Demo projects & sample targets`}</pre>
        </div>
      </section>
    </div>
  );
}
