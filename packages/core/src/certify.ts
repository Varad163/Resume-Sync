/**
 * Cryptographic certification of Post-Quantum Readiness.
 *
 * Provides utilities to package scan findings and CBOM records into a signed,
 * verifiable compliance artifact.
 *
 * Production uses AWS KMS Asymmetric RSA Key Signing when CERTIFY_KMS_KEY_ARN is configured.
 * Development falls back to local RSA key generation.
 */

import crypto from "node:crypto";
import { KMSClient, SignCommand, GetPublicKeyCommand } from "@aws-sdk/client-kms";

export interface PqcCertificate {
  readonly scanId: string;
  readonly project: { id: string; name: string };
  readonly certifiedAt: string;
  readonly posture: { overall: number; severity: string };
  readonly cbomHash: string;
  readonly findingsConfirmed: number;
  readonly signature: string;
}

export function constructCertificatePayload(input: {
  scanId: string;
  projectId: string;
  projectName: string;
  overallPosture: number;
  severity: string;
  cbomHash: string;
  findingsCount: number;
  certifiedAt: string;
}): string {
  return [
    input.scanId,
    input.projectId,
    input.projectName,
    input.overallPosture.toString(),
    input.severity,
    input.cbomHash,
    input.findingsCount.toString(),
    input.certifiedAt,
  ].join("|");
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
  const payload = constructCertificatePayload({
    scanId,
    projectId,
    projectName,
    overallPosture,
    severity,
    cbomHash,
    findingsCount,
    certifiedAt,
  });

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

/** Async certificate generator supporting KMS Asymmetric Key signing. */
export async function generateCertificateAsync(input: {
  scanId: string;
  projectName: string;
  projectId: string;
  overallPosture: number;
  severity: string;
  cbomJson: string;
  findingsCount: number;
  privateKeyPem?: string;
  kmsKeyArn?: string;
}): Promise<PqcCertificate> {
  const { scanId, projectName, projectId, overallPosture, severity, cbomJson, findingsCount, privateKeyPem, kmsKeyArn } = input;
  const certifiedAt = new Date().toISOString();

  const cbomHash = crypto.createHash("sha256").update(cbomJson).digest("hex");
  const payload = constructCertificatePayload({
    scanId,
    projectId,
    projectName,
    overallPosture,
    severity,
    cbomHash,
    findingsCount,
    certifiedAt,
  });

  let signature = "";
  if (kmsKeyArn) {
    const region = process.env["AWS_REGION"] || "us-east-1";
    const kms = new KMSClient({ region });
    const response = await kms.send(
      new SignCommand({
        KeyId: kmsKeyArn,
        Message: Buffer.from(payload),
        MessageType: "RAW",
        SigningAlgorithm: "RSASSA_PKCS1_V1_5_SHA_256",
      }),
    );

    if (response.Signature) {
      signature = Buffer.from(response.Signature).toString("base64");
    } else {
      throw new Error("KMS signing response carried no signature payload");
    }
  } else if (privateKeyPem) {
    const sign = crypto.createSign("sha256");
    sign.update(payload);
    signature = sign.sign(privateKeyPem, "base64");
  } else {
    throw new Error("Neither KMS Key ARN nor private key provided for certificate signing");
  }

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

/** Fetches public key from AWS KMS or returns local key. */
export async function getKmsPublicKeyPem(kmsKeyArn: string): Promise<string> {
  const region = process.env["AWS_REGION"] || "us-east-1";
  const kms = new KMSClient({ region });
  const response = await kms.send(new GetPublicKeyCommand({ KeyId: kmsKeyArn }));

  if (!response.PublicKey) {
    throw new Error("KMS GetPublicKey carried no public key bytes");
  }

  const base64 = Buffer.from(response.PublicKey).toString("base64");
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----\n`;
}

/** Verifies the authenticity of a PqcCertificate signature against a public key. */
export function verifyCertificate(cert: PqcCertificate, publicKeyPem: string): boolean {
  const payload = constructCertificatePayload({
    scanId: cert.scanId,
    projectId: cert.project.id,
    projectName: cert.project.name,
    overallPosture: cert.posture.overall,
    severity: cert.posture.severity,
    cbomHash: cert.cbomHash,
    findingsCount: cert.findingsConfirmed,
    certifiedAt: cert.certifiedAt,
  });

  const verify = crypto.createVerify("sha256");
  verify.update(payload);
  return verify.verify(publicKeyPem, cert.signature, "base64");
}

/** Generates a new 2048-bit RSA key pair for certification signature signing in local development. */
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
