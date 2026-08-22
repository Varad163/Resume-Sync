# IronBastion Platform — Design

**Date:** 2026-08-22
**Status:** Approved, in implementation

## Purpose

A hosted SaaS that discovers cryptography in a customer's estate, assembles a
Cryptographic Bill of Materials, scores quantum risk, and produces a
post-quantum migration plan. Agentic AI adjudicates; deterministic collectors
find. Deploys to AWS. The marketing site (`ironbastion`, GoDaddy) is a separate
repo and shares nothing but the brand.

## Decisions taken

| Decision | Choice | Why |
|---|---|---|
| First slice | SENTINEL → ATLAS → ORACLE → MIGRATE, built for real | The discovery→CBOM→risk→plan chain is the defensible product core |
| Access model | Hosted SaaS, read-only connectors | Fastest to build and sell; source never persisted |
| Agentic layer | Deterministic tools produce facts, Claude agents reason over them | Findings stay reproducible and auditable |
| Stack | TypeScript monorepo, ECS Fargate | One language; scans exceed Lambda's ceiling and need disk |
| v1 coverage | JVM source, JVM build dependencies, TLS endpoint probing | Dominant enterprise stack + findings source analysis cannot produce |
| Claude access | Claude Platform on AWS (`@anthropic-ai/aws-sdk`) | SigV4/IAM auth — no API key to store; AWS billing; full feature parity |
| Model | `claude-opus-5` for adjudication and planning; `claude-haiku-4-5` for bulk triage | Cost scales with ambiguity, not repo size |
| Repo | `~/Websites/ironbastion-platform`, separate git repo | Product CI/CD never touches the GoDaddy site |

Deferred by design, not forgotten: FORGE (implementation testing), SENTINEL-OT,
CERTIFY, WATCHTOWER, and the container/other-language collectors. SPECTRA and
VANGUARD are bench operations and remain planner-only, as the site states.

## Architecture

```
packages/
  core/         domain types + provenance model
  collectors/   jvm-source, jvm-deps, tls-probe  ← the truth layer
  cbom/         CycloneDX 1.6 cryptographic-asset assembly
  risk/         quantum risk scoring (pure functions, no LLM)
  agents/       agent definitions + Claude runtime
  db/           schema, migrations, tenant-scoped repositories
apps/
  api/          Fastify REST API
  worker/       SQS consumer running scan campaigns
  cli/          `ironbastion scan` — same engine, no AWS
  console/      React + Vite SPA
infra/          AWS CDK
```

### Two-layer analysis

Collectors emit **candidates** carrying hard provenance: rule id, file, line,
snippet hash, confidence. Agents never scan. They adjudicate — resolve wrapper
indirection, judge runtime reachability, reject false positives, and supply the
judgement inputs the scoring formulas need.

A finding's existence always traces to a collector rule. An agent may confirm,
downgrade or reject it, and that verdict is stored alongside the model id,
prompt version, token cost and stated reasoning. The score itself is computed by
a pure function from evidence slots; the model fills slots, it never writes the
number.

### Scan campaign

1. API creates a `Scan`, enqueues it.
2. Worker mints a short-lived GitHub installation token, shallow-clones to
   encrypted ephemeral disk.
3. Collectors run; candidates land in Postgres, evidence in per-tenant
   KMS-encrypted S3.
4. Agent campaign runs phase by phase, each phase persisted and resumable.
5. Reports render to JSON, CycloneDX and PDF.
6. The clone is destroyed with the task. Source is never persisted.

### Privacy posture

Only bounded snippets around a candidate are sent to the model, subject to a
hard per-scan cap. A tenant may enable **metadata-only mode**, in which the
agents receive rule ids, algorithm names and file paths but no source text at
all. Findings degrade in confidence rather than disappearing.

## Testing

Fixture Java repositories with known crypto usage drive collector tests; CBOM
output is snapshot-tested against the CycloneDX schema; the risk engine is
pure-function unit tested. Agent behaviour is tested against recorded model
responses so CI never makes a live call, with a separate opt-in live smoke test.

## Implementation order

1. `core`, `collectors`, `cbom`, `risk`, `cli` — the engine, offline-testable
2. `agents` — the Claude runtime and the four agents
3. `db`, `api`, `worker` — the platform
4. `console`
5. `infra` — CDK, CI/CD, deploy
