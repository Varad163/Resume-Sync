/** Decomposition of a TLS cipher suite name into the primitives it commits to. */

export interface SuiteComposition {
  readonly keyExchange?: string;
  readonly authentication?: string;
  readonly cipher?: string;
  readonly cipherKeySize?: number;
  readonly mac?: string;
}

/**
 * TLS 1.2 suites name every component (`TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256`).
 * TLS 1.3 suites name only the AEAD and hash (`TLS_AES_256_GCM_SHA384`) because
 * key exchange is negotiated separately — so the caller supplies the group from
 * the handshake rather than us inventing one.
 */
export function decomposeSuite(standardName: string): SuiteComposition {
  const name = standardName.toUpperCase();
  const [, body = ""] = name.split(/^TLS_/);
  const [exchangePart, cipherPart] = body.includes("_WITH_")
    ? (body.split("_WITH_") as [string, string])
    : [undefined, body];

  const composition: {
    keyExchange?: string;
    authentication?: string;
    cipher?: string;
    cipherKeySize?: number;
    mac?: string;
  } = {};

  if (exchangePart) {
    const parts = exchangePart.split("_");
    composition.keyExchange = parts[0];
    composition.authentication = parts[1] ?? parts[0];
  }

  const cipherTokens = (cipherPart ?? "").split("_");
  const aesIndex = cipherTokens.indexOf("AES");
  if (aesIndex !== -1) {
    composition.cipher = "AES";
    const size = Number.parseInt(cipherTokens[aesIndex + 1] ?? "", 10);
    if (!Number.isNaN(size)) composition.cipherKeySize = size;
  } else if (cipherTokens.includes("CHACHA20")) {
    composition.cipher = "CHACHA20";
    composition.cipherKeySize = 256;
  } else if (cipherTokens.includes("3DES") || cipherTokens.includes("DES")) {
    composition.cipher = "3DES";
    composition.cipherKeySize = 112;
  } else if (cipherTokens.includes("RC4")) {
    composition.cipher = "RC4";
    composition.cipherKeySize = 128;
  }

  const mac = cipherTokens.find((token) => token.startsWith("SHA") || token === "MD5");
  if (mac) composition.mac = mac === "SHA" ? "SHA-1" : mac.replace(/^SHA(\d+)$/, "SHA-$1");

  return composition;
}
