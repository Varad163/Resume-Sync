export interface DocPageMeta {
  id: string;
  path: string;
  title: string;
  subtitle: string;
  section: string;
  keywords: string[];
}

export interface DocSection {
  title: string;
  items: DocPageMeta[];
}

export const DOC_PAGES: DocPageMeta[] = [
  // 1. GETTING STARTED
  {
    id: "introduction",
    path: "/docs",
    title: "Introduction",
    subtitle: "Overview of IronBastion post-quantum cryptographic security posture and inventory management platform.",
    section: "Getting Started",
    keywords: ["ironbastion", "introduction", "overview", "post-quantum", "pqc", "inventory", "cbom", "vulnerability"],
  },
  {
    id: "what-is-ironbastion",
    path: "/docs/what-is-ironbastion",
    title: "What is IronBastion?",
    subtitle: "Learn why cryptographic inventory matters and how IronBastion protects systems from quantum risk.",
    section: "Getting Started",
    keywords: ["what is ironbastion", "problem", "quantum risk", "shor's algorithm", "harvest now decrypt later", "pqc"],
  },
  {
    id: "how-it-works",
    path: "/docs/how-it-works",
    title: "How IronBastion Works",
    subtitle: "End-to-end multi-agent pipeline: Discover, Analyze, Score, Plan, Certify, and Monitor.",
    section: "Getting Started",
    keywords: ["how it works", "pipeline", "discovery", "crypto detection", "sentinel", "oracle", "atlas", "migrate"],
  },
  {
    id: "quick-start",
    path: "/docs/quick-start",
    title: "Quick Start",
    subtitle: "Connect your first repository and run an automated post-quantum scan in under 5 minutes.",
    section: "Getting Started",
    keywords: ["quick start", "getting started", "first scan", "tutorial", "connect repo", "workspace"],
  },

  // 2. USING IRONBASTION
  {
    id: "using-dashboard",
    path: "/docs/using/dashboard",
    title: "Dashboard",
    subtitle: "Monitor overall security posture, findings severity spectrum, crypto asset count, and remediation effort.",
    section: "Using IronBastion",
    keywords: ["dashboard", "posture", "severity", "critical", "high", "medium", "low", "overview"],
  },
  {
    id: "using-projects",
    path: "/docs/using/projects",
    title: "Projects",
    subtitle: "Organize repositories and TLS endpoints into logical project estates for multi-target scanning.",
    section: "Using IronBastion",
    keywords: ["projects", "project management", "targets", "configuration", "tenant"],
  },
  {
    id: "using-repositories",
    path: "/docs/using/repositories",
    title: "Repositories",
    subtitle: "Manage connected GitHub repositories, git branches, local paths, and target sources.",
    section: "Using IronBastion",
    keywords: ["repositories", "github repos", "branches", "remote url", "git"],
  },
  {
    id: "using-scans",
    path: "/docs/using/scans",
    title: "Scans",
    subtitle: "Trigger, track, and review execution details for queued, active, completed, or failed scans.",
    section: "Using IronBastion",
    keywords: ["scans", "scan lifecycle", "queued", "running", "succeeded", "failed", "scan details"],
  },
  {
    id: "using-findings",
    path: "/docs/using/findings",
    title: "Findings",
    subtitle: "Deep-dive into individual cryptographic vulnerabilities, code locations, evidence, and remediation advice.",
    section: "Using IronBastion",
    keywords: ["findings", "vulnerabilities", "algorithm", "primitive", "location", "evidence", "remediation"],
  },
  {
    id: "using-inventory",
    path: "/docs/using/inventory",
    title: "Cryptographic Inventory",
    subtitle: "Inspect discovered cryptographic assets: algorithms, key sizes, primitives, and exact code locations.",
    section: "Using IronBastion",
    keywords: ["inventory", "crypto asset", "algorithms", "primitives", "key length", "provenance"],
  },
  {
    id: "using-cbom",
    path: "/docs/using/cbom",
    title: "CBOM",
    subtitle: "Generate and export standardized CycloneDX 1.6 Cryptographic Bill of Materials in JSON format.",
    section: "Using IronBastion",
    keywords: ["cbom", "cyclonedx", "bill of materials", "cyclonedx 1.6", "export", "download"],
  },
  {
    id: "using-migration-plan",
    path: "/docs/using/migration-plan",
    title: "Migration Plan",
    subtitle: "Review AI-orchestrated PQC migration waves, effort estimates, algorithm replacements, and custom roadmaps.",
    section: "Using IronBastion",
    keywords: ["migration plan", "waves", "remediation", "pqc replacement", "effort", "wave simulator"],
  },
  {
    id: "using-watchtower",
    path: "/docs/using/watchtower",
    title: "Watchtower",
    subtitle: "Continuous monitoring for commit SHA changes and differential posture tracking across scans.",
    section: "Using IronBastion",
    keywords: ["watchtower", "monitoring", "commit diff", "introduced", "resolved", "persistent", "polling"],
  },
  {
    id: "using-certify",
    path: "/docs/using/certify",
    title: "CERTIFY",
    subtitle: "Generate cryptographically signed PQC readiness attestation certificates backed by RSA-2048 & KMS.",
    section: "Using IronBastion",
    keywords: ["certify", "certificate", "attestation", "kms", "rsa-2048", "public key", "signature"],
  },
  {
    id: "using-issues",
    path: "/docs/using/issues",
    title: "Issues",
    subtitle: "Filter, categorize, and track resolution of security findings across scan runs.",
    section: "Using IronBastion",
    keywords: ["issues", "kpi filter", "spectrum", "security issues", "remediation tracking"],
  },

  // 3. INTEGRATIONS
  {
    id: "integrations-github-app",
    path: "/docs/integrations/github-app",
    title: "GitHub App",
    subtitle: "Step-by-step setup guide for zero-token GitHub App integration, OAuth permissions, and token isolation.",
    section: "Integrations",
    keywords: ["github app", "integration", "permissions", "installation token", "oauth", "private key"],
  },
  {
    id: "integrations-zip-upload",
    path: "/docs/integrations/zip-upload",
    title: "ZIP Upload",
    subtitle: "Upload and scan standalone ZIP archives safely with 50MB limit and Zip Slip path traversal protection.",
    section: "Integrations",
    keywords: ["zip upload", "50mb", "zip slip", "path traversal", "ephemeral", "archive"],
  },
  {
    id: "integrations-cli-scanner",
    path: "/docs/integrations/cli-scanner",
    title: "CLI Scanner",
    subtitle: "Run local security scans from your terminal or CI/CD pipelines using the standalone CLI runner.",
    section: "Integrations",
    keywords: ["cli scanner", "npm run scan", "terminal", "ci cd", "local scan", "options"],
  },
  {
    id: "integrations-tls-scanning",
    path: "/docs/integrations/tls-scanning",
    title: "TLS Scanning",
    subtitle: "Probe live TLS endpoints to inspect active cipher suites, certificate key lengths, and handshake protocols.",
    section: "Integrations",
    keywords: ["tls scanning", "tls probe", "cipher suites", "handshake", "certificates", "port 443"],
  },

  // 4. SECURITY & ACCESS
  {
    id: "security-authentication",
    path: "/docs/security/authentication",
    title: "Authentication",
    subtitle: "Enterprise authentication flow, Bearer tokens, token claims, and local dev mode fallback.",
    section: "Security & Access",
    keywords: ["authentication", "jwt", "bearer token", "cognito", "dev auth", "claims"],
  },
  {
    id: "security-cognito",
    path: "/docs/security/cognito",
    title: "Cognito",
    subtitle: "AWS Cognito User Pool integration with OAuth 2.0 PKCE, JWKS validation, and custom tenant claims.",
    section: "Security & Access",
    keywords: ["cognito", "user pool", "pkce", "jwks", "custom claims", "issuer"],
  },
  {
    id: "security-multi-tenancy",
    path: "/docs/security/multi-tenancy",
    title: "Multi-Tenancy",
    subtitle: "PostgreSQL Row Level Security (RLS) and strict tenant isolation model.",
    section: "Security & Access",
    keywords: ["multi-tenancy", "tenant isolation", "rls", "row level security", "tenant_id"],
  },
  {
    id: "security-credentials",
    path: "/docs/security/credentials",
    title: "Workspace & API Credentials",
    subtitle: "Managing API tokens, session credentials, and workspace isolation.",
    section: "Security & Access",
    keywords: ["workspace credentials", "api token", "security headers", "access control"],
  },
  {
    id: "security-data-security",
    path: "/docs/security/data-security",
    title: "Data Security",
    subtitle: "Ephemeral source code checkout, memory-only extraction, log sanitization, and data protection.",
    section: "Security & Access",
    keywords: ["data security", "ephemeral checkout", "privacy", "sanitization", "log privacy"],
  },
  {
    id: "security-secrets",
    path: "/docs/security/secrets",
    title: "Secrets Management",
    subtitle: "AWS Secrets Manager, KMS key management, and zero-disk credential isolation.",
    section: "Security & Access",
    keywords: ["secrets management", "aws secrets manager", "kms", "git askpass", "private key"],
  },

  // 5. SCANNING
  {
    id: "scanning-lifecycle",
    path: "/docs/scanning/lifecycle",
    title: "Scan Lifecycle",
    subtitle: "Detailed breakdown of the scan execution phases: DISCOVER, COLLECT, ADJUDICATE, ASSESS, PLAN, REPORT.",
    section: "Scanning",
    keywords: ["scan lifecycle", "phases", "discover", "collect", "adjudicate", "assess", "plan", "report"],
  },
  {
    id: "scanning-languages",
    path: "/docs/scanning/languages",
    title: "Supported Languages",
    subtitle: "Currently supported languages: Java/Kotlin (JVM), Python, JavaScript/TypeScript, and TLS protocols.",
    section: "Scanning",
    keywords: ["supported languages", "java", "kotlin", "python", "javascript", "typescript", "jvm"],
  },
  {
    id: "scanning-dependency",
    path: "/docs/scanning/dependency",
    title: "Dependency Scanning",
    subtitle: "Extracting declared cryptographic libraries from Maven (pom.xml), Gradle, NPM (package.json), and PyPI.",
    section: "Scanning",
    keywords: ["dependency scanning", "pom.xml", "build.gradle", "package.json", "requirements.txt", "pyproject.toml"],
  },
  {
    id: "scanning-source-code",
    path: "/docs/scanning/source-code",
    title: "Source Code Scanning",
    subtitle: "Tokenizer-based AST analysis and rule pattern matching across Java, Python, and JS/TS source files.",
    section: "Scanning",
    keywords: ["source code scanning", "tokenizer", "ast", "pattern matching", "rules", "java", "python", "js"],
  },
  {
    id: "scanning-tls-detection",
    path: "/docs/scanning/tls-detection",
    title: "TLS Detection",
    subtitle: "Live TLS probe collector, cipher suite decomposition, curve resolution, and certificate signature parsing.",
    section: "Scanning",
    keywords: ["tls detection", "cipher suites", "ecdhe", "rsa", "signature algorithm", "oid"],
  },
  {
    id: "scanning-ai-analysis",
    path: "/docs/scanning/ai-analysis",
    title: "AI Analysis",
    subtitle: "Multi-agent LLM analysis: SENTINEL adjudication, ORACLE risk assessment, ATLAS inventory, and MIGRATE planning.",
    section: "Scanning",
    keywords: ["ai analysis", "llm", "claude", "sentinel", "oracle", "atlas", "migrate", "agent prompt"],
  },
  {
    id: "scanning-deterministic",
    path: "/docs/scanning/deterministic",
    title: "Deterministic Detection",
    subtitle: "Offline, zero-hallucination deterministic fallback rules ensuring scans run reliably without AI models.",
    section: "Scanning",
    keywords: ["deterministic detection", "fallback", "offline mode", "rules engine", "provenance"],
  },
  {
    id: "scanning-risk-scoring",
    path: "/docs/scanning/risk-scoring",
    title: "Risk Scoring",
    subtitle: "Exact mathematical formula for quantum risk scoring, reachability multipliers, and severity boundaries.",
    section: "Scanning",
    keywords: ["risk scoring", "formula", "weights", "quantum exposure", "data lifetime", "reachability", "severity"],
  },

  // 6. ARCHITECTURE
  {
    id: "architecture-system",
    path: "/docs/architecture/system",
    title: "System Architecture",
    subtitle: "High-level overview of IronBastion monorepo, API server, worker daemon, and core packages.",
    section: "Architecture",
    keywords: ["system architecture", "monorepo", "packages", "apps", "fastify", "worker"],
  },
  {
    id: "architecture-pipeline",
    path: "/docs/architecture/pipeline",
    title: "Scan Pipeline",
    subtitle: "Data flow from target checkout through candidate collection, agent pipeline, to database persistence.",
    section: "Architecture",
    keywords: ["scan pipeline", "data flow", "candidate collection", "artefact bucket"],
  },
  {
    id: "architecture-ai-agents",
    path: "/docs/architecture/ai-agents",
    title: "AI Agent Architecture",
    subtitle: "Agent orchestration, prompt versioning, structured schema validation, and token budget management.",
    section: "Architecture",
    keywords: ["ai agent architecture", "budget", "schema validation", "sentinel", "oracle", "migrate"],
  },
  {
    id: "architecture-database",
    path: "/docs/architecture/database",
    title: "Database Architecture",
    subtitle: "PostgreSQL schema design, PGLite local driver, migrations, and row-level tenant configuration.",
    section: "Architecture",
    keywords: ["database architecture", "postgresql", "pglite", "schema", "migrations", "rls"],
  },
  {
    id: "architecture-aws",
    path: "/docs/architecture/aws",
    title: "AWS Infrastructure",
    subtitle: "CloudFront, ALB, ECS Fargate Tasks, Aurora Serverless v2, SQS DLQ, KMS, and VPC isolation.",
    section: "Architecture",
    keywords: ["aws infrastructure", "cdk", "cloudfront", "alb", "fargate", "aurora", "sqs", "kms"],
  },
  {
    id: "architecture-storage",
    path: "/docs/architecture/storage",
    title: "Storage & Evidence",
    subtitle: "S3 artefact bucket storage, cryptographic evidence indexing, and audit log history.",
    section: "Architecture",
    keywords: ["storage", "evidence", "s3 bucket", "artefacts", "audit log"],
  },
  {
    id: "architecture-queue-worker",
    path: "/docs/architecture/queue-worker",
    title: "Queue & Worker Architecture",
    subtitle: "Asynchronous SQS scan queue, worker polling loop, graceful SIGTERM handling, and DLQ retries.",
    section: "Architecture",
    keywords: ["queue", "worker", "sqs", "dlq", "graceful shutdown", "polling"],
  },

  // 7. ENTERPRISE / OPERATIONS
  {
    id: "operations-production-deployment",
    path: "/docs/operations/production-deployment",
    title: "Production Deployment",
    subtitle: "Prerequisites, CDK deployment commands, environment configuration, and verification steps.",
    section: "Enterprise / Operations",
    keywords: ["production deployment", "cdk synth", "cdk deploy", "production readiness", "prerequisites"],
  },
  {
    id: "operations-monitoring",
    path: "/docs/operations/monitoring",
    title: "Monitoring",
    subtitle: "System health checks, CloudWatch logs, SQS queue metrics, and Watchtower continuous scanning.",
    section: "Enterprise / Operations",
    keywords: ["monitoring", "cloudwatch", "health checks", "metrics", "watchtower"],
  },
  {
    id: "operations-audit-logs",
    path: "/docs/operations/audit-logs",
    title: "Audit Logs",
    subtitle: "Immutable tenant audit logging for all user actions, scan triggers, and configuration changes.",
    section: "Enterprise / Operations",
    keywords: ["audit logs", "activity log", "actor", "action", "subject", "tenant audit"],
  },
  {
    id: "operations-reliability",
    path: "/docs/operations/reliability",
    title: "Reliability",
    subtitle: "Fail-closed security controls, SQS Dead Letter Queue retries, and database transaction safety.",
    section: "Enterprise / Operations",
    keywords: ["reliability", "fail-closed", "dlq", "transactions", "graceful stop"],
  },
  {
    id: "operations-tenant-isolation",
    path: "/docs/operations/tenant-isolation",
    title: "Tenant Isolation",
    subtitle: "Deep-dive into multi-tenant PostgreSQL Row Level Security (RLS) enforcement and query isolation.",
    section: "Enterprise / Operations",
    keywords: ["tenant isolation", "rls", "set_config", "tenant_id", "security boundary"],
  },
  {
    id: "operations-security-controls",
    path: "/docs/operations/security-controls",
    title: "Security Controls",
    subtitle: "Comprehensive summary of platform security controls, headers, token sanitization, and CORS policy.",
    section: "Enterprise / Operations",
    keywords: ["security controls", "headers", "cors", "token redaction", "zip slip"],
  },

  // 8. REFERENCE
  {
    id: "reference-api",
    path: "/docs/reference/api",
    title: "API Reference",
    subtitle: "Complete Fastify HTTP REST API specification covering Projects, Scans, GitHub, Watchtower, CBOM, CERTIFY, and Audit.",
    section: "Reference",
    keywords: ["api reference", "rest api", "endpoints", "fastify", "request body", "response"],
  },
  {
    id: "reference-env-vars",
    path: "/docs/reference/env-vars",
    title: "Environment Variables",
    subtitle: "Complete list of environment variables used across API, Worker, CLI, and CDK infrastructure.",
    section: "Reference",
    keywords: ["environment variables", ".env", "config", "github app id", "kms key", "cognito"],
  },
  {
    id: "reference-cli",
    path: "/docs/reference/cli",
    title: "CLI Reference",
    subtitle: "Command line arguments, options, flags, exit codes, and output formats for the `ironbastion scan` tool.",
    section: "Reference",
    keywords: ["cli reference", "command line", "flags", "exit codes", "--tls", "--cbom", "--json"],
  },
  {
    id: "reference-troubleshooting",
    path: "/docs/reference/troubleshooting",
    title: "Troubleshooting",
    subtitle: "Common errors, diagnostic procedures, and resolution steps for GitHub connection, scanning, and KMS issues.",
    section: "Reference",
    keywords: ["troubleshooting", "diagnostics", "common errors", "0 findings", "github disconnected", "certify error"],
  },
  {
    id: "reference-faq",
    path: "/docs/reference/faq",
    title: "FAQ",
    subtitle: "Frequently Asked Questions about IronBastion, post-quantum risk, CBOM, scanner behavior, and data privacy.",
    section: "Reference",
    keywords: ["faq", "frequently asked questions", "post-quantum", "readme files", "source code storage"],
  },
  {
    id: "reference-glossary",
    path: "/docs/reference/glossary",
    title: "Glossary",
    subtitle: "Definitions of key cryptographic, post-quantum, and IronBastion platform terminology.",
    section: "Reference",
    keywords: ["glossary", "definitions", "pqc", "cbom", "shor's algorithm", "grover's algorithm", "kms"],
  },
];

export const DOC_SECTIONS: DocSection[] = [
  {
    title: "Getting Started",
    items: DOC_PAGES.filter((p) => p.section === "Getting Started"),
  },
  {
    title: "Using IronBastion",
    items: DOC_PAGES.filter((p) => p.section === "Using IronBastion"),
  },
  {
    title: "Integrations",
    items: DOC_PAGES.filter((p) => p.section === "Integrations"),
  },
  {
    title: "Security & Access",
    items: DOC_PAGES.filter((p) => p.section === "Security & Access"),
  },
  {
    title: "Scanning",
    items: DOC_PAGES.filter((p) => p.section === "Scanning"),
  },
  {
    title: "Architecture",
    items: DOC_PAGES.filter((p) => p.section === "Architecture"),
  },
  {
    title: "Enterprise / Operations",
    items: DOC_PAGES.filter((p) => p.section === "Enterprise / Operations"),
  },
  {
    title: "Reference",
    items: DOC_PAGES.filter((p) => p.section === "Reference"),
  },
];

/** Map of legacy/alternate paths to canonical doc pages */
const PATH_ALIASES: Record<string, string> = {
  "/docs/scanning/repositories": "/docs/using/repositories",
  "/docs/scanning/github": "/docs/integrations/github-app",
  "/docs/github": "/docs/integrations/github-app",
  "/docs/scanning/zip": "/docs/integrations/zip-upload",
  "/docs/scanning/cli": "/docs/integrations/cli-scanner",
  "/docs/analysis/inventory": "/docs/using/inventory",
  "/docs/analysis/findings": "/docs/using/findings",
  "/docs/analysis/risk-scoring": "/docs/scanning/risk-scoring",
  "/docs/outputs/cbom": "/docs/using/cbom",
  "/docs/outputs/migration-plan": "/docs/using/migration-plan",
  "/docs/outputs/reports": "/docs/using/dashboard",
  "/docs/outputs/certify": "/docs/using/certify",
  "/docs/monitoring/watchtower": "/docs/using/watchtower",
  "/docs/architecture/security": "/docs/security/data-security",
  "/docs/development/local-development": "/docs/quick-start",
  "/docs/development/project-structure": "/docs/architecture/system",
  "/docs/development/testing": "/docs/operations/production-deployment",
  "/docs/development/environment": "/docs/reference/env-vars",
  "/docs/troubleshooting": "/docs/reference/troubleshooting",
};

export function getDocPageByPath(path: string): DocPageMeta | undefined {
  const cleanPath = path.replace(/\/$/, "");
  const targetPath = PATH_ALIASES[cleanPath] || cleanPath;
  return DOC_PAGES.find((p) => p.path === targetPath || p.path === targetPath + "/") || DOC_PAGES[0];
}

export function getPrevAndNextPages(currentPath: string): { prev?: DocPageMeta; next?: DocPageMeta } {
  const cleanPath = currentPath.replace(/\/$/, "");
  const targetPath = PATH_ALIASES[cleanPath] || cleanPath;
  const index = DOC_PAGES.findIndex((p) => p.path === targetPath);
  if (index === -1) return { prev: undefined, next: DOC_PAGES[1] };
  return {
    prev: DOC_PAGES[index - 1],
    next: DOC_PAGES[index + 1],
  };
}
