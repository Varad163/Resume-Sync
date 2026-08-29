/**
 * Domain types for FORGE dynamic cryptographic validation.
 */

export interface HandshakeTraceStep {
  readonly name: string;
  readonly message: string;
  readonly status: "success" | "warning" | "error";
  readonly timestamp: string;
}

export interface VerificationCheck {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: "pass" | "fail";
  readonly severity: "critical" | "high" | "medium" | "low" | "none";
  readonly logs: readonly string[];
}

export interface ForgeVerificationReport {
  readonly scanId: string;
  readonly targetId: string;
  readonly overallStatus: "verified" | "insecure" | "broken" | "failed";
  readonly checks: readonly VerificationCheck[];
  readonly traces: readonly HandshakeTraceStep[];
}

export interface VerificationRecord {
  readonly id: string;
  readonly scanId: string;
  readonly targetId: string;
  readonly status: "verified" | "insecure" | "broken" | "failed";
  readonly details: ForgeVerificationReport;
  readonly verifiedAt: string;
}
