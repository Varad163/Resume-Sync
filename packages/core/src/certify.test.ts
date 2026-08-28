import { describe, expect, it } from "vitest";
import { generateCertificate, verifyCertificate, generateCertificateKeys } from "./certify.js";

describe("PQC Certificate module", () => {
  it("generates 2048-bit RSA key pairs correctly", () => {
    const { privateKey, publicKey } = generateCertificateKeys();
    expect(privateKey).toContain("-----BEGIN RSA PRIVATE KEY-----");
    expect(publicKey).toContain("-----BEGIN RSA PUBLIC KEY-----");
  });

  it("signs and verifies a valid certificate successfully", () => {
    const { privateKey, publicKey } = generateCertificateKeys();
    const mockCbom = JSON.stringify({
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      components: [],
    });

    const cert = generateCertificate({
      scanId: "scan_12345",
      projectName: "ACME Core Platform",
      projectId: "project_99",
      overallPosture: 92,
      severity: "low",
      cbomJson: mockCbom,
      findingsCount: 4,
      privateKeyPem: privateKey,
    });

    expect(cert.scanId).toBe("scan_12345");
    expect(cert.project.name).toBe("ACME Core Platform");
    expect(cert.posture.overall).toBe(92);
    expect(cert.findingsConfirmed).toBe(4);
    expect(cert.signature).toBeTruthy();

    const isValid = verifyCertificate(cert, publicKey);
    expect(isValid).toBe(true);
  });

  it("fails verification if the certificate payload is tampered with", () => {
    const { privateKey, publicKey } = generateCertificateKeys();
    const mockCbom = JSON.stringify({
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      components: [],
    });

    const cert = generateCertificate({
      scanId: "scan_12345",
      projectName: "ACME Core Platform",
      projectId: "project_99",
      overallPosture: 92,
      severity: "low",
      cbomJson: mockCbom,
      findingsCount: 4,
      privateKeyPem: privateKey,
    });

    // Verify untampered
    expect(verifyCertificate(cert, publicKey)).toBe(true);

    // Tamper with overall posture score
    const tamperedScoreCert = {
      ...cert,
      posture: {
        ...cert.posture,
        overall: 100, // modified score!
      },
    };
    expect(verifyCertificate(tamperedScoreCert, publicKey)).toBe(false);

    // Tamper with findings count
    const tamperedCountCert = {
      ...cert,
      findingsConfirmed: 0, // modified count!
    };
    expect(verifyCertificate(tamperedCountCert, publicKey)).toBe(false);
  });
});
