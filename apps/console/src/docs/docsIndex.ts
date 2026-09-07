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
  // GETTING STARTED
  {
    id: "overview",
    path: "/docs",
    title: "Overview",
    subtitle: "Understand, scan, analyze, and migrate cryptographic assets for the post-quantum era.",
    section: "GETTING STARTED",
    keywords: ["ironbastion", "overview", "post-quantum", "pqc", "introduction", "cbom", "vulnerability"],
  },
  {
    id: "how-it-works",
    path: "/docs/how-it-works",
    title: "How IronBastion Works",
    subtitle: "End-to-end pipeline: Discover, Analyze, Plan, Report, and Monitor.",
    section: "GETTING STARTED",
    keywords: ["pipeline", "discover", "analyze", "plan", "report", "monitor", "sentinel", "oracle", "atlas", "migrate"],
  },
  {
    id: "quick-start",
    path: "/docs/quick-start",
    title: "Quick Start Guide",
    subtitle: "Get up and running with your first cryptographic security scan in under 5 minutes.",
    section: "GETTING STARTED",
    keywords: ["quickstart", "first scan", "tutorial", "beginner", "guide", "add repo"],
  },

  // SCANNING
  {
    id: "scanning-repositories",
    path: "/docs/scanning/repositories",
    title: "Repository Scanning",
    subtitle: "Supported scanning methods: GitHub App, Git URL, ZIP Upload, and CLI.",
    section: "SCANNING",
    keywords: ["repositories", "methods", "git", "github", "zip", "cli", "checkout"],
  },
  {
    id: "scanning-github",
    path: "/docs/scanning/github",
    title: "GitHub App Integration",
    subtitle: "Configure and connect read-only GitHub App access for automated scanning.",
    section: "SCANNING",
    keywords: ["github", "app", "oauth", "permissions", "callback", "private key", "integration"],
  },
  {
    id: "scanning-zip",
    path: "/docs/scanning/zip",
    title: "ZIP Archive Upload",
    subtitle: "Scan offline or standalone projects without connecting a remote Git repository.",
    section: "SCANNING",
    keywords: ["zip", "upload", "archive", "ephemeral", "file", "offline", "drag drop"],
  },
  {
    id: "scanning-cli",
    path: "/docs/scanning/cli",
    title: "CLI Scanner",
    subtitle: "Run local security scans directly from your terminal and CI pipelines.",
    section: "SCANNING",
    keywords: ["cli", "terminal", "command line", "npm run scan", "local scan", "ci cd"],
  },

  // ANALYSIS
  {
    id: "analysis-inventory",
    path: "/docs/analysis/inventory",
    title: "Cryptographic Inventory",
    subtitle: "Comprehensive inventory of discovered algorithms, keys, and libraries.",
    section: "ANALYSIS",
    keywords: ["inventory", "algorithms", "crypto assets", "aes", "rsa", "ecdsa", "sha-256", "cbom"],
  },
  {
    id: "analysis-findings",
    path: "/docs/analysis/findings",
    title: "Security Findings",
    subtitle: "Understand confirmed vulnerabilities, severity levels, and code locations.",
    section: "ANALYSIS",
    keywords: ["findings", "vulnerabilities", "severity", "critical", "high", "medium", "low", "evidence"],
  },
  {
    id: "analysis-risk-scoring",
    path: "/docs/analysis/risk-scoring",
    title: "Risk Scoring Methodology",
    subtitle: "Deterministic quantum vulnerability scoring based on cryptographic evidence.",
    section: "ANALYSIS",
    keywords: ["risk score", "methodology", "deterministic", "quantum vulnerability", "shor's algorithm"],
  },

  // OUTPUTS
  {
    id: "outputs-cbom",
    path: "/docs/outputs/cbom",
    title: "Cryptographic Bill of Materials (CBOM)",
    subtitle: "Standardized CycloneDX 1.6 CBOM generation and download.",
    section: "OUTPUTS",
    keywords: ["cbom", "cyclonedx", "bill of materials", "export", "json", "cyclonedx 1.6"],
  },
  {
    id: "outputs-migration-plan",
    path: "/docs/outputs/migration-plan",
    title: "PQC Migration Plan & Wave Simulator",
    subtitle: "Prioritized, AI-era remediation roadmap and wave customization.",
    section: "OUTPUTS",
    keywords: ["migration plan", "pqc", "wave simulator", "effort", "engineer days", "roadmap", "re-architect"],
  },
  {
    id: "outputs-reports",
    path: "/docs/outputs/reports",
    title: "Executive Reports",
    subtitle: "Generate and view HTML & PDF executive security reports.",
    section: "OUTPUTS",
    keywords: ["reports", "executive report", "html report", "pdf", "audit", "summary"],
  },
  {
    id: "outputs-certify",
    path: "/docs/outputs/certify",
    title: "CERTIFY Cryptographic Attestation",
    subtitle: "Cryptographic proof certificates signed with digital signatures.",
    section: "OUTPUTS",
    keywords: ["certify", "attestation", "signature", "certificate", "public key", "verification"],
  },

  // MONITORING
  {
    id: "monitoring-watchtower",
    path: "/docs/monitoring/watchtower",
    title: "Watchtower Continuous Monitoring",
    subtitle: "Automated Git commit polling and differential cryptographic tracking.",
    section: "MONITORING",
    keywords: ["watchtower", "continuous monitoring", "polling", "diff", "git poller", "commit delta"],
  },

  // ARCHITECTURE
  {
    id: "architecture-platform",
    path: "/docs/architecture",
    title: "Platform Architecture",
    subtitle: "High-level overview of core packages, API server, worker, and agent orchestration.",
    section: "ARCHITECTURE",
    keywords: ["architecture", "packages", "core", "collectors", "runner", "worker", "fastify", "sqs"],
  },
  {
    id: "architecture-security",
    path: "/docs/architecture/security",
    title: "Security & Data Handling",
    subtitle: "Tenant isolation, read-only permissions, credential protections, and audit logging.",
    section: "ARCHITECTURE",
    keywords: ["security", "tenant isolation", "privacy", "data handling", "audit log", "ephemeral"],
  },

  // DEVELOPMENT
  {
    id: "development-local",
    path: "/docs/development/local-development",
    title: "Local Development",
    subtitle: "Set up and run IronBastion locally in development mode.",
    section: "DEVELOPMENT",
    keywords: ["local development", "dev mode", "npm run dev", "localhost", "setup"],
  },
  {
    id: "development-structure",
    path: "/docs/development/project-structure",
    title: "Project Structure",
    subtitle: "Directory layout and organization of monorepo packages and apps.",
    section: "DEVELOPMENT",
    keywords: ["project structure", "monorepo", "directory", "packages", "apps"],
  },
  {
    id: "development-testing",
    path: "/docs/development/testing",
    title: "Testing & Build Commands",
    subtitle: "Unit tests, type checking, linting, and CDK build verification.",
    section: "DEVELOPMENT",
    keywords: ["testing", "vitest", "typecheck", "lint", "bundle", "build"],
  },
  {
    id: "development-environment",
    path: "/docs/development/environment",
    title: "Environment Variables",
    subtitle: "Configuration parameters and GitHub App environment variables.",
    section: "DEVELOPMENT",
    keywords: ["environment variables", ".env", "github app id", "secret", "config"],
  },

  // TROUBLESHOOTING
  {
    id: "troubleshooting",
    path: "/docs/troubleshooting",
    title: "Troubleshooting & FAQ",
    subtitle: "Solutions for common issues, configuration errors, and diagnostic steps.",
    section: "TROUBLESHOOTING",
    keywords: ["troubleshooting", "faq", "errors", "issues", "callback error", "github 404"],
  },
];

export const DOC_SECTIONS: DocSection[] = [
  {
    title: "GETTING STARTED",
    items: DOC_PAGES.filter((p) => p.section === "GETTING STARTED"),
  },
  {
    title: "SCANNING",
    items: DOC_PAGES.filter((p) => p.section === "SCANNING"),
  },
  {
    title: "ANALYSIS",
    items: DOC_PAGES.filter((p) => p.section === "ANALYSIS"),
  },
  {
    title: "OUTPUTS",
    items: DOC_PAGES.filter((p) => p.section === "OUTPUTS"),
  },
  {
    title: "MONITORING",
    items: DOC_PAGES.filter((p) => p.section === "MONITORING"),
  },
  {
    title: "ARCHITECTURE",
    items: DOC_PAGES.filter((p) => p.section === "ARCHITECTURE"),
  },
  {
    title: "DEVELOPMENT",
    items: DOC_PAGES.filter((p) => p.section === "DEVELOPMENT"),
  },
  {
    title: "TROUBLESHOOTING",
    items: DOC_PAGES.filter((p) => p.section === "TROUBLESHOOTING"),
  },
];

export function getDocPageByPath(path: string): DocPageMeta | undefined {
  const cleanPath = path.replace(/\/$/, "");
  return DOC_PAGES.find((p) => p.path === cleanPath || p.path === cleanPath + "/");
}

export function getPrevAndNextPages(currentPath: string): { prev?: DocPageMeta; next?: DocPageMeta } {
  const cleanPath = currentPath.replace(/\/$/, "");
  const index = DOC_PAGES.findIndex((p) => p.path === cleanPath);
  if (index === -1) return {};
  return {
    prev: DOC_PAGES[index - 1],
    next: DOC_PAGES[index + 1],
  };
}
