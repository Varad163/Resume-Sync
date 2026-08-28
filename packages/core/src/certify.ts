/**
 * Cryptographic certification of Post-Quantum Readiness.
 *
 * Provides utilities to package scan findings and CBOM records into a signed,
 * verifiable compliance artifact.
 */

import crypto from "node:crypto";

export interface PqcCertificate {
  readonly scanId: string;
  readonly project: { id: string; name: string };
  readonly certifiedAt: string;
  readonly posture: { overall: number; severity: string };
  readonly cbomHash: string;
  readonly findingsConfirmed: number;
  readonly signature: string;
}

/** Signs the posture details and CBOM hash, returning a PqcCertificate. */
export function generateCertificate(input: {
  scanId: string;
  projectName: string;
  projectId: string;
  overallPosture: number;
  severity: string;
  cbomJson: string;
  findingsCount: number;
  privateKeyPem: string;
}): PqcCertificate {
  const { scanId, projectName, projectId, overallPosture, severity, cbomJson, findingsCount, privateKeyPem } = input;
  const certifiedAt = new Date().toISOString();

  // Generate SHA-256 hash of the CBOM
  const cbomHash = crypto.createHash("sha256").update(cbomJson).digest("hex");

  // Create signature payload
  const payload = [
    scanId,
    projectId,
    projectName,
    overallPosture.toString(),
    severity,
    cbomHash,
    findingsCount.toString(),
    certifiedAt,
  ].join("|");

  // Sign the payload
  const sign = crypto.createSign("sha256");
  sign.update(payload);
  const signature = sign.sign(privateKeyPem, "base64");

  return {
    scanId,
    project: { id: projectId, name: projectName },
    certifiedAt,
    posture: { overall: overallPosture, severity },
    cbomHash,
    findingsConfirmed: findingsCount,
    signature,
  };
}

/** Verifies the authenticity of a PqcCertificate signature against a public key. */
export function verifyCertificate(cert: PqcCertificate, publicKeyPem: string): boolean {
  const payload = [
    cert.scanId,
    cert.project.id,
    cert.project.name,
    cert.posture.overall.toString(),
    cert.posture.severity,
    cert.cbomHash,
    cert.findingsConfirmed.toString(),
    cert.certifiedAt,
  ].join("|");

  const verify = crypto.createVerify("sha256");
  verify.update(payload);
  return verify.verify(publicKeyPem, cert.signature, "base64");
}

/** Generates a new 2048-bit RSA key pair for certification signature signing. */
export function generateCertificateKeys(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "pkcs1",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs1",
      format: "pem",
    },
  });

  return { privateKey, publicKey };
}
