# IronBastion Platform

The product behind [ironbastion.ai](../ironbastion): an agentic AI platform that
discovers cryptography across an estate, assembles a Cryptographic Bill of
Materials, scores quantum risk, and produces a post-quantum migration plan.

Deploys to AWS. The marketing site is a **separate repository** and deploys to
GoDaddy; the two share a brand and nothing else.

---

## Run it

```bash
npm install
npm run dev
```

- Console — <http://localhost:5199>
- API — <http://localhost:8787>

That is the whole platform: API, scan worker, agent pipeline, and an embedded
PostgreSQL, in one process. No Docker, no AWS account, no configuration. It seeds
a demo tenant pointed at `fixtures/java-payments`, so pressing **Run scan** does
real work immediately.

Scan any repository from the command line:

```bash
npm run scan -- /path/to/a/java/repo
npm run scan -- /path/to/repo --tls api.example.com:443 --cbom cbom.json
```

| Command | What it does |
|---|---|
| `npm test` | The full suite |
| `npm run typecheck` | `tsc --noEmit` across every workspace |
| `npm run lint` | ESLint |
| `npm run bundle` | Builds the API and worker into single files for their images |
| `npm run synth` | Synthesizes the CloudFormation template |
| `npm run deploy` | Builds the console and deploys the stack |

---

## What it actually does

A scan runs a campaign in four phases.

**DISCOVER — deterministic collectors.** Nothing here is a model.

| Collector | Finds |
|---|---|
| `jvm-source` | Cryptography in Java and Kotlin source: ciphers, key generation, signatures, digests, MACs, key agreement, TLS contexts, key stores, named curves. Resolves `static final` constants and links `kpg.initialize(2048)` back to the generator it configures. |
| `jvm-deps` | Crypto-relevant Maven and Gradle dependencies, and the version constraints that decide what a migration can reach — a Bouncy Castle older than 1.72 cannot emit ML-KEM at all. |
| `tls-probe` | What an endpoint actually negotiates: protocol, suite, accepted key-exchange groups, and the certificate chain's signature algorithms and key strengths. Recovers the signature algorithm from the DER, which Node does not expose. |

Every candidate carries provenance: the rule that fired, the file, the line, and
a SHA-256 of the exact bytes examined.

**ANALYZE — agents adjudicate.** Collectors find; agents judge.

- **SENTINEL** decides what each detection *is*: real or a false positive,
  reachable at runtime or only in tests, and — where the collector could not
  resolve it — what algorithm is actually configured. It reads the repository
  through a sandboxed, read-only tool surface to find out.
- **ORACLE** decides what the cryptography *protects*: how long the data stays
  sensitive, and how exposed the component is. It never returns a score.

**PLAN — inventory and sequencing.**

- **ATLAS** reads the assembled CBOM and writes the summary an engineering lead
  gets thirty seconds for.
- **MIGRATE** sequences the work into waves aimed at the public milestones, with
  dependencies, risks and validation steps.

**REPORT** — findings, CycloneDX 1.6 CBOM, migration plan, and a printable
assurance report.

### Where the line sits

An agent never invents a finding and never writes a number.

- A finding exists because a collector rule fired. An agent can confirm, reject
  or downgrade it; a submission naming a candidate id the agent was not given is
  rejected and handed back.
- Risk scores are computed by a fixed formula from evidence the agents supply.
  The same evidence always produces the same score, which is what makes a trend
  line meaningful and an audit possible.
- Target algorithms come from the registry's sanctioned replacement, checked at
  validation time. A plan proposing anything else is rejected with the value it
  should have used.
- When no model is configured, or a scan exhausts its budget, the pipeline
  finishes on rule-based heuristics — and every one of those verdicts is stamped
  `deterministic-rules`, visible per finding in the console and counted in the
  report.

---

## Layout

```
packages/
  core/         domain types, the algorithm registry, provenance, milestones
  collectors/   jvm-source, jvm-deps, tls-probe
  cbom/         CycloneDX 1.6 cryptographic-asset assembly
  risk/         quantum risk scoring — pure functions, no model
  agents/       Claude runtime, the four agents, the rule-based fallback
  runner/       scan execution, repository checkout, the queue seam
  db/           schema, tenant-scoped repositories
apps/
  api/          Fastify REST API and the printable report
  worker/       SQS consumer running campaigns on Fargate
  cli/          `ironbastion scan` — the engine without the platform
  console/      React console
infra/          AWS CDK
fixtures/       a Java payments repo and TLS certificates, used by the tests
```

---

## Deploying to AWS

The stack: an ALB in front of a Fargate API service, a second Fargate service
draining an SQS queue of scans, Aurora PostgreSQL Serverless v2 in isolated
subnets, S3 and KMS for evidence, Cognito for identity, and CloudFront in front
of the console with `/v1/*` routed to the ALB so the console and API share an
origin.

```bash
npx cdk bootstrap                                   # once per account and region
npm run deploy -- -c anthropicWorkspaceId=wrkspc_…  # builds images and deploys
```

Claude is reached through **Claude Platform on AWS**: the task role calls
`aws-external-anthropic:CreateInference` with SigV4, scoped to that one
workspace ARN. There is no API key in the stack to store, rotate or leak.

Worker capacity tracks queue depth rather than CPU, because a scan is IO- and
model-bound — CPU scaling would sit idle while a backlog built up.

### Data handling

- Repositories are shallow-cloned to a per-scan directory on ephemeral task
  storage and deleted when the scan ends, whatever the outcome. Source is never
  persisted.
- Clone credentials go through a `GIT_ASKPASS` helper, so a token never reaches
  the process table, a log line, or `.git/config`. Errors are redacted before
  they are recorded.
- Only bounded snippets around a candidate are sent to the model. A tenant can
  enable **metadata-only mode**, in which agents receive rule ids, algorithm
  names and paths but no source text at all; findings lose confidence rather
  than disappearing.
- Every table holding customer data carries `tenant_id`, and only the
  repositories in `packages/db` write SQL — so no route handler can forget it.

---

## Configuration

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. Unset uses embedded PGlite. |
| `SCAN_QUEUE_URL` | SQS queue. Unset uses the in-process queue. |
| `IRONBASTION_AUTH` | `dev` accepts `Bearer dev.<tenantId>.<email>`. Anything else requires Cognito. |
| `IRONBASTION_INLINE_WORKER` | `1` drains the queue inside the API process. |
| `IRONBASTION_MODEL_PROVIDER` | `aws`, `anthropic` or `deterministic`. Auto-detected. |
| `ANTHROPIC_AWS_WORKSPACE_ID` + `AWS_REGION` | Selects Claude Platform on AWS. |
| `ANTHROPIC_API_KEY` | Selects the direct Anthropic API. |
| `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` | Production authentication. |

Dev auth is not a fallback. It is refused unless `IRONBASTION_AUTH=dev` is set
explicitly, because a fallback is how a development shortcut reaches production.

---

## Not built, deliberately

The site describes ten agents. Four are built here, and the rest are scoped
rather than stubbed:

| Agent | Status |
|---|---|
| FORGE — implementation testing | Not built. Needs a fuzzing and constant-time harness of its own. |
| SENTINEL-OT — OT/SCADA validation | Not built. Needs an industrial protocol stack and a lab. |
| SPECTRA, VANGUARD — side-channel and fault injection | Not software. Bench operations on real hardware, human-authorised, as the site states. |
| CERTIFY, WATCHTOWER — evidence packaging, continuous posture | Not built. Both consume the outputs above and follow naturally once those exist. |

Coverage is JVM source, JVM dependencies and TLS endpoints. Containers and other
language ecosystems are additive: implement the `Collector` interface and add it
to `ALL_COLLECTORS`.
