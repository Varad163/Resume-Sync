import { describe, expect, it } from "vitest";
import { detectJvmCrypto } from "./rules.js";

const find = (src: string, ruleId: string) =>
  detectJvmCrypto(src).find((d) => d.ruleId === ruleId);

describe("detectJvmCrypto", () => {
  it("resolves a literal cipher transformation into algorithm, mode and padding", () => {
    const d = find('Cipher c = Cipher.getInstance("AES/GCM/NoPadding");', "JVM-CIPHER");
    expect(d).toMatchObject({
      algorithm: "AES",
      parameters: { mode: "GCM", padding: "NoPadding" },
      line: 1,
      confidence: 0.95,
    });
    expect(d?.ambiguity).toEqual([]);
  });

  it("links a key size set after construction back to the generator", () => {
    const src = [
      "KeyPairGenerator kpg = KeyPairGenerator.getInstance(\"RSA\");",
      "kpg.initialize(2048);",
    ].join("\n");
    expect(find(src, "JVM-KEYPAIR-GEN")?.parameters.keySize).toBe(2048);
  });

  it("resolves a key size held in a constant", () => {
    const src = [
      "int KEY_BITS = 4096;",
      'KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");',
      "kpg.initialize(KEY_BITS);",
    ].join("\n");
    expect(find(src, "JVM-KEYPAIR-GEN")?.parameters.keySize).toBe(4096);
  });

  it("resolves an algorithm held in a String constant", () => {
    const src = [
      'String ALG = "SHA256withECDSA";',
      "Signature s = Signature.getInstance(ALG);",
    ].join("\n");
    const d = find(src, "JVM-SIGNATURE");
    expect(d?.algorithm).toBe("ECDSA");
    expect(d?.confidence).toBeCloseTo(0.88);
  });

  it("still reports an unresolvable algorithm, flagged for an agent to read", () => {
    const d = find("Cipher c = Cipher.getInstance(config.getAlgorithm());", "JVM-CIPHER");
    expect(d).toBeDefined();
    expect(d?.algorithm).toBe("UNRESOLVED");
    expect(d?.confidence).toBeLessThan(0.5);
    expect(d?.ambiguity).toContain("indirect-algorithm");
  });

  it("flags a runtime-configurable algorithm read from a variable", () => {
    const d = find("Cipher c = Cipher.getInstance(algName);", "JVM-CIPHER");
    expect(d?.ambiguity).toContain("configurable-at-runtime");
  });

  it("captures the JCE provider when one is named", () => {
    const d = find('Cipher.getInstance("AES/CBC/PKCS5Padding", "BC");', "JVM-CIPHER");
    expect(d?.parameters.provider).toBe("BC");
  });

  it("reads the named curve from ECGenParameterSpec and attaches it to the generator", () => {
    const src = [
      'KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");',
      'ECGenParameterSpec spec = new ECGenParameterSpec("secp256r1");',
      "kpg.initialize(spec);",
    ].join("\n");
    const detections = detectJvmCrypto(src);
    expect(detections.find((d) => d.ruleId === "JVM-EC-CURVE")?.parameters.curve).toBe("secp256r1");
    expect(detections.find((d) => d.ruleId === "JVM-KEYPAIR-GEN")?.parameters.curve).toBe("secp256r1");
    // The field size, not the 128-bit security strength it provides.
    expect(detections.find((d) => d.ruleId === "JVM-EC-CURVE")?.parameters.keySize).toBe(256);
  });

  it("reads the algorithm bound to raw key material", () => {
    const d = find('SecretKeySpec k = new SecretKeySpec(bytes, "AES");', "JVM-SECRET-KEY-SPEC");
    expect(d?.algorithm).toBe("AES");
  });

  it("detects digests, MACs, key agreement, TLS versions and key stores", () => {
    const src = [
      'MessageDigest.getInstance("SHA-1");',
      'Mac.getInstance("HmacSHA256");',
      'KeyAgreement.getInstance("ECDH");',
      'SSLContext.getInstance("TLSv1.2");',
      'KeyStore.getInstance("PKCS12");',
      'SecureRandom.getInstance("SHA1PRNG");',
    ].join("\n");
    const byRule = Object.fromEntries(detectJvmCrypto(src).map((d) => [d.ruleId, d.algorithm]));
    expect(byRule["JVM-DIGEST"]).toBe("SHA-1");
    expect(byRule["JVM-MAC"]).toBe("HMAC-SHA256");
    expect(byRule["JVM-KEY-AGREEMENT"]).toBe("ECDH");
    expect(byRule["JVM-SSL-CONTEXT"]).toBe("TLS1.2");
    expect(byRule["JVM-KEYSTORE"]).toBe("PKCS12");
    expect(byRule["JVM-SECURE-RANDOM"]).toBe("SHA1PRNG");
  });

  it("ignores cryptography that appears only in comments", () => {
    expect(detectJvmCrypto('// Cipher.getInstance("RSA")')).toEqual([]);
    expect(detectJvmCrypto('/* MessageDigest.getInstance("MD5"); */')).toEqual([]);
  });

  it("reports the line each detection sits on", () => {
    const src = ["package a;", "", "class B {", '  Cipher c = Cipher.getInstance("DES");', "}"].join("\n");
    expect(find(src, "JVM-CIPHER")?.line).toBe(4);
  });
});
