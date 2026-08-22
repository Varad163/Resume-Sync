/**
 * Just enough DER to recover a certificate's signature algorithm.
 *
 * Node exposes the peer's public key, validity and fingerprint, but not the
 * algorithm the issuer actually signed with — and that is precisely the field a
 * quantum-risk assessment needs, because it tells you what breaks when the CA's
 * signature does. So we walk the two outer SEQUENCEs of the certificate and read
 * the AlgorithmIdentifier OID. Nothing else is decoded.
 *
 *   Certificate ::= SEQUENCE { tbsCertificate TBSCertificate,
 *                              signatureAlgorithm AlgorithmIdentifier,
 *                              signatureValue BIT STRING }
 */

export const SIGNATURE_OIDS: Record<string, string> = {
  "1.2.840.113549.1.1.5": "SHA1withRSA",
  "1.2.840.113549.1.1.11": "SHA256withRSA",
  "1.2.840.113549.1.1.12": "SHA384withRSA",
  "1.2.840.113549.1.1.13": "SHA512withRSA",
  "1.2.840.113549.1.1.10": "RSASSA-PSS",
  "1.2.840.113549.1.1.4": "MD5withRSA",
  "1.2.840.10045.4.3.2": "SHA256withECDSA",
  "1.2.840.10045.4.3.3": "SHA384withECDSA",
  "1.2.840.10045.4.3.4": "SHA512withECDSA",
  "1.2.840.10045.4.1": "SHA1withECDSA",
  "1.2.840.10040.4.3": "SHA1withDSA",
  "2.16.840.1.101.3.4.3.2": "SHA256withDSA",
  "1.3.101.112": "Ed25519",
  "1.3.101.113": "Ed448",
};

interface TlvHeader {
  readonly tag: number;
  readonly contentStart: number;
  readonly contentLength: number;
}

function readHeader(der: Uint8Array, offset: number): TlvHeader | undefined {
  if (offset + 1 >= der.length) return undefined;
  const tag = der[offset]!;
  const first = der[offset + 1]!;

  if (first < 0x80) {
    return { tag, contentStart: offset + 2, contentLength: first };
  }
  const lengthBytes = first & 0x7f;
  if (lengthBytes === 0 || offset + 1 + lengthBytes >= der.length) return undefined;
  let length = 0;
  for (let i = 0; i < lengthBytes; i++) {
    length = length * 256 + der[offset + 2 + i]!;
  }
  return { tag, contentStart: offset + 2 + lengthBytes, contentLength: length };
}

/** Decodes an OBJECT IDENTIFIER body to dotted-decimal form. */
export function decodeOid(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  const first = bytes[0]!;
  const parts = [Math.floor(first / 40), first % 40];
  let value = 0;
  for (let i = 1; i < bytes.length; i++) {
    const byte = bytes[i]!;
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) {
      parts.push(value);
      value = 0;
    }
  }
  return parts.join(".");
}

/**
 * Returns the signature algorithm name, the raw OID, or undefined if the
 * structure is not what a certificate should look like.
 */
export function signatureAlgorithmOf(der: Uint8Array): { oid: string; name?: string } | undefined {
  const certificate = readHeader(der, 0);
  if (!certificate || certificate.tag !== 0x30) return undefined;

  const tbs = readHeader(der, certificate.contentStart);
  if (!tbs || tbs.tag !== 0x30) return undefined;

  const algorithmOffset = tbs.contentStart + tbs.contentLength;
  const algorithm = readHeader(der, algorithmOffset);
  if (!algorithm || algorithm.tag !== 0x30) return undefined;

  const oidHeader = readHeader(der, algorithm.contentStart);
  if (!oidHeader || oidHeader.tag !== 0x06) return undefined;

  const oid = decodeOid(der.subarray(oidHeader.contentStart, oidHeader.contentStart + oidHeader.contentLength));
  const name = SIGNATURE_OIDS[oid];
  return name ? { oid, name } : { oid };
}
