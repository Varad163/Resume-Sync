/**
 * The TLS probe is tested against a real TLS server started in-process, so the
 * handshake, the certificate chain walk and the ASN.1 signature extraction are
 * all exercised for real — no mocked sockets.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:tls";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { TlsEndpointTarget } from "@ironbastion/core";
import { candidatesFromHandshake, observeHandshake, tlsProbeCollector } from "./probe.js";
import { decomposeSuite } from "./cipher-suites.js";
import { signatureAlgorithmOf, decodeOid } from "./asn1.js";
import type { CollectorContext } from "../shared/types.js";

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL(`../../../../fixtures/tls/${name}`, import.meta.url)));

const ctx: CollectorContext = {
  scanId: "scan_tls",
  metadataOnly: false,
  now: () => "2026-08-22T00:00:00.000Z",
};

function startServer(key: Buffer, cert: Buffer, options: Record<string, unknown> = {}): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = createServer({ key, cert, ...options }, (socket) => socket.end());
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, port: typeof address === "object" && address ? address.port : 0 });
    });
  });
}

let rsaServer: { server: Server; port: number };
let ecServer: { server: Server; port: number };
let legacyServer: { server: Server; port: number };

beforeAll(async () => {
  rsaServer = await startServer(fixture("rsa-key.pem"), fixture("rsa-cert.pem"));
  ecServer = await startServer(fixture("ec-key.pem"), fixture("ec-cert.pem"));
  legacyServer = await startServer(fixture("rsa-key.pem"), fixture("rsa-cert.pem"), {
    maxVersion: "TLSv1.2",
    ciphers: "ECDHE-RSA-AES128-SHA256",
  });
});

afterAll(async () => {
  for (const s of [rsaServer, ecServer, legacyServer]) s?.server.close();
});

const targetFor = (port: number, host = "127.0.0.1"): TlsEndpointTarget => ({
  kind: "tls-endpoint",
  id: `ep_${port}`,
  host,
  port,
  serverName: "legacy.acme.test",
});

describe("observeHandshake", () => {
  it("records the negotiated protocol and suite", async () => {
    const observation = await observeHandshake(targetFor(rsaServer.port));
    expect(observation.protocol).toMatch(/^TLSv1\.[23]$/);
    expect(observation.cipherStandardName).toMatch(/^TLS_/);
  });

  it("enumerates the key exchange groups the endpoint accepts", async () => {
    const observation = await observeHandshake(targetFor(rsaServer.port));
    expect(observation.supportedGroups).toContain("X25519");
    expect(observation.supportedGroups).toContain("prime256v1");
  });

  it("skips enumeration when asked, for a single-handshake probe", async () => {
    const observation = await observeHandshake(targetFor(rsaServer.port), {
      enumerateGroups: false,
    });
    expect(observation.supportedGroups).toEqual([]);
  });

  it("recovers the certificate signature algorithm that Node does not expose", async () => {
    const observation = await observeHandshake(targetFor(rsaServer.port));
    expect(observation.certificates[0]?.signatureAlgorithm).toBe("SHA256withRSA");
    expect(observation.certificates[0]?.publicKeyType).toBe("rsa");
    expect(observation.certificates[0]?.publicKeyBits).toBe(2048);
  });

  it("reads an EC certificate's curve and signature", async () => {
    const observation = await observeHandshake(targetFor(ecServer.port));
    expect(observation.certificates[0]?.signatureAlgorithm).toBe("SHA256withECDSA");
    expect(observation.certificates[0]?.namedCurve).toBe("prime256v1");
  });

  it("reports an untrusted chain as an observation rather than failing", async () => {
    const observation = await observeHandshake(targetFor(rsaServer.port));
    expect(observation.authorized).toBe(false);
    expect(observation.authorizationError).toBeTruthy();
  });

  it("fails cleanly when nothing is listening", async () => {
    await expect(observeHandshake(targetFor(1), { timeoutMs: 1500 })).rejects.toThrow();
  });
});

describe("candidatesFromHandshake", () => {
  it("emits protocol, key exchange, bulk cipher and certificate candidates", async () => {
    const target = targetFor(rsaServer.port);
    const candidates = candidatesFromHandshake(target, await observeHandshake(target), ctx);
    const rules = candidates.map((c) => c.provenance.ruleId);
    expect(rules).toContain("TLS-PROTOCOL");
    expect(rules).toContain("TLS-KEY-EXCHANGE");
    expect(rules).toContain("TLS-BULK-CIPHER");
    expect(rules).toContain("TLS-CERT-SIGNATURE");
    expect(rules).toContain("TLS-CERT-KEY");
  });

  it("marks the RSA certificate key as quantum-broken", async () => {
    const target = targetFor(rsaServer.port);
    const candidates = candidatesFromHandshake(target, await observeHandshake(target), ctx);
    const key = candidates.find((c) => c.provenance.ruleId === "TLS-CERT-KEY");
    expect(key?.quantum).toBe("broken");
    expect(key?.parameters.keySize).toBe(2048);
  });

  it("carries the endpoint as the component and needs no agent to identify it", async () => {
    const target = targetFor(rsaServer.port);
    const candidates = candidatesFromHandshake(target, await observeHandshake(target), ctx);
    expect(candidates[0]?.component).toBe(`127.0.0.1:${rsaServer.port}`);
    expect(candidates[0]?.ambiguity).toEqual([]);
  });
});

describe("tlsProbeCollector", () => {
  it("collects from a live endpoint", async () => {
    const out = await tlsProbeCollector.collect(targetFor(rsaServer.port), ctx);
    expect(out.unitsScanned).toBe(1);
    expect(out.candidates.length).toBeGreaterThan(3);
    expect(out.notes[0]).toContain("chain not trusted");
  });

  it("turns an unreachable endpoint into a note, not a crash", async () => {
    const out = await tlsProbeCollector.collect(targetFor(1), ctx);
    expect(out.candidates).toEqual([]);
    expect(out.notes).toHaveLength(1);
  });

  it("observes a legacy TLS 1.2 endpoint with a SHA-1-era suite", async () => {
    const out = await tlsProbeCollector.collect(targetFor(legacyServer.port), ctx);
    const protocol = out.candidates.find((c) => c.provenance.ruleId === "TLS-PROTOCOL");
    expect(protocol?.algorithm).toBe("TLS1.2");
  });
});

describe("decomposeSuite", () => {
  it("splits a TLS 1.2 suite into every component it commits to", () => {
    expect(decomposeSuite("TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256")).toEqual({
      keyExchange: "ECDHE",
      authentication: "RSA",
      cipher: "AES",
      cipherKeySize: 128,
      mac: "SHA-256",
    });
  });

  it("handles a TLS 1.3 suite, which names no key exchange", () => {
    const suite = decomposeSuite("TLS_AES_256_GCM_SHA384");
    expect(suite.cipher).toBe("AES");
    expect(suite.cipherKeySize).toBe(256);
    expect(suite.keyExchange).toBeUndefined();
  });

  it("recognises ChaCha20 and legacy 3DES suites", () => {
    expect(decomposeSuite("TLS_CHACHA20_POLY1305_SHA256").cipher).toBe("CHACHA20");
    expect(decomposeSuite("TLS_RSA_WITH_3DES_EDE_CBC_SHA").cipher).toBe("3DES");
  });
});

describe("asn1", () => {
  it("decodes object identifiers", () => {
    expect(decodeOid(new Uint8Array([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b]))).toBe(
      "1.2.840.113549.1.1.11",
    );
  });

  it("returns undefined for bytes that are not a certificate", () => {
    expect(signatureAlgorithmOf(new Uint8Array([1, 2, 3]))).toBeUndefined();
  });
});
