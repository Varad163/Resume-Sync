export interface AgentSpec {
  readonly id: string;
  readonly codename: string;
  readonly discipline: string;
  readonly phase: string;
  readonly mission: string;
  readonly built: boolean;
  readonly note?: string;
}

/** The roster the marketing site describes, with build status told honestly. */
export const ROSTER: readonly AgentSpec[] = [
  {
    id: "sentinel",
    codename: "SENTINEL",
    discipline: "Cryptographic discovery",
    phase: "ANALYZE",
    mission:
      "Decide what each detection actually is: real cryptography or a false positive, running in production or only in tests, and — where the collector could not resolve it — which algorithm is really configured.",
    built: true,
  },
  {
    id: "oracle",
    codename: "ORACLE",
    discipline: "Quantum risk assessment",
    phase: "ANALYZE",
    mission:
      "Decide what the cryptography protects: how long the data stays sensitive, and how exposed the component is. Supplies evidence to the scoring formula; never writes a score.",
    built: true,
  },
  {
    id: "atlas",
    codename: "ATLAS",
    discipline: "Crypto inventory & CBOM",
    phase: "PLAN",
    mission:
      "Read the assembled Cryptographic Bill of Materials and state what this estate runs on, where the quantum-vulnerable weight sits, and the structural facts that matter.",
    built: true,
  },
  {
    id: "migrate",
    codename: "MIGRATE",
    discipline: "PQC migration planning",
    phase: "PLAN",
    mission:
      "Sequence the work into waves aimed at the public milestones, with dependencies, risks and validation. Algorithm choice is dictated by the standards registry, not by the agent.",
    built: true,
  },
  {
    id: "bastion",
    codename: "BASTION",
    discipline: "Remediation & pull requests",
    phase: "PLAN",
    mission:
      "Write code changes that replace non-quantum-resistant crypto with approved primitives, maintaining backward compatibility and generating PRs.",
    built: false,
    note: "Planned for Q3 2026. Code changes currently produced via manual guidance.",
  },
  {
    id: "watchtower",
    codename: "WATCHTOWER",
    discipline: "Continuous posture monitoring",
    phase: "REPORT",
    mission:
      "Monitor repository commits and dependency changes over time, re-running analysis when cryptographic touchpoints change.",
    built: true,
  },
  {
    id: "forge",
    codename: "FORGE",
    discipline: "Formal verification",
    phase: "REPORT",
    mission:
      "Verify CBOM compliance against NIST FIPS 203/204/205 standards and validate cryptographic boundaries.",
    built: true,
  },
  {
    id: "certify",
    codename: "CERTIFY",
    discipline: "PQC Readiness Certification",
    phase: "REPORT",
    mission:
      "Generate cryptographic compliance evidence and verification artifacts for the repository.",
    built: true,
  },
];
