export function DocsArchitectureAiAgentsPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>AI Agent Architecture &amp; Client Model</h2>
        <p>
          The agent subsystem (<code>packages/agents</code>) manages model invocation, budget ceilings, structured schema validation, and fallback handling.
        </p>
      </section>

      <section className="docs-section">
        <h2>Model Provider Configuration</h2>
        <ul>
          <li><b>AWS Bedrock / Anthropic Claude (Production)</b>: Uses <code>@anthropic-ai/aws-sdk</code> or <code>@anthropic-ai/sdk</code> when <code>AWS_REGION</code> and <code>ANTHROPIC_AWS_WORKSPACE_ID</code> or <code>ANTHROPIC_API_KEY</code> are set.</li>
          <li><b>Deterministic Fallback Mode</b>: Automatically activates when model API keys are unconfigured, Bedrock calls fail, or budget limits are reached.</li>
          <li><b>Budget Ceiling (<code>budgetCents</code>)</b>: Scans enforce a model spend ceiling (default 50 cents). If budget is exhausted, campaign execution seamlessly switches to rule-based fallback.</li>
        </ul>
      </section>
    </div>
  );
}
