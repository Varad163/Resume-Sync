/**
 * Cryptographic detection rules for JVM source.
 *
 * The rules run over the token stream rather than a syntax tree, with just
 * enough dataflow to answer the two questions that decide whether a finding is
 * usable: *which* algorithm (resolving `static final` constants, not only
 * literals) and *at what strength* (linking `kpg.initialize(2048)` back to the
 * generator it configures).
 *
 * Where the algorithm cannot be resolved statically — `Cipher.getInstance(cfg)`
 * — the rule still fires, at low confidence and flagged `indirect-algorithm`.
 * That is the signal for an agent to go and read the surrounding code. Dropping
 * it would hide exactly the configurable cryptography that blocks agility.
 */

import type { AmbiguityReason, CryptoParameters, CryptoPrimitive } from "@ironbastion/core";
import { parseTransformation } from "@ironbastion/core";
import { tokenizeJava, type Token } from "./tokenizer.js";

export interface JvmDetection {
  readonly ruleId: string;
  /** Algorithm string exactly as resolved from source. */
  readonly algorithmRaw: string;
  readonly algorithm: string;
  readonly primitive: CryptoPrimitive;
  readonly parameters: CryptoParameters;
  readonly line: number;
  readonly column: number;
  readonly confidence: number;
  readonly ambiguity: readonly AmbiguityReason[];
  readonly note: string;
}

/** `X.getInstance(...)` factories, and what a call to each one means. */
const FACTORIES: Record<string, { ruleId: string; primitive: CryptoPrimitive; note: string }> = {
  Cipher: {
    ruleId: "JVM-CIPHER",
    primitive: "block-cipher",
    note: "Encryption or key transport via javax.crypto.Cipher",
  },
  KeyPairGenerator: {
    ruleId: "JVM-KEYPAIR-GEN",
    primitive: "public-key-encryption",
    note: "Asymmetric key pair generation",
  },
  KeyGenerator: {
    ruleId: "JVM-KEY-GEN",
    primitive: "block-cipher",
    note: "Symmetric key generation",
  },
  KeyFactory: {
    ruleId: "JVM-KEY-FACTORY",
    primitive: "public-key-encryption",
    note: "Asymmetric key material handling",
  },
  SecretKeyFactory: {
    ruleId: "JVM-SECRET-KEY-FACTORY",
    primitive: "kdf",
    note: "Secret key derivation",
  },
  Signature: { ruleId: "JVM-SIGNATURE", primitive: "signature", note: "Digital signature" },
  MessageDigest: { ruleId: "JVM-DIGEST", primitive: "hash", note: "Message digest" },
  Mac: { ruleId: "JVM-MAC", primitive: "mac", note: "Message authentication code" },
  KeyAgreement: {
    ruleId: "JVM-KEY-AGREEMENT",
    primitive: "key-agreement",
    note: "Key agreement / shared secret establishment",
  },
  SecureRandom: { ruleId: "JVM-SECURE-RANDOM", primitive: "drbg", note: "Random bit generation" },
  SSLContext: { ruleId: "JVM-SSL-CONTEXT", primitive: "protocol", note: "TLS protocol selection" },
  KeyStore: { ruleId: "JVM-KEYSTORE", primitive: "key-store", note: "Key store access" },
  CertificateFactory: {
    ruleId: "JVM-CERT-FACTORY",
    primitive: "certificate",
    note: "Certificate handling",
  },
};

/** Constructors whose string argument names an algorithm or curve. */
const CONSTRUCTOR_RULES: Record<string, { ruleId: string; primitive: CryptoPrimitive; argIndex: number; note: string; asCurve?: boolean }> = {
  SecretKeySpec: {
    ruleId: "JVM-SECRET-KEY-SPEC",
    primitive: "block-cipher",
    argIndex: 1,
    note: "Symmetric key material bound to an algorithm",
  },
  ECGenParameterSpec: {
    ruleId: "JVM-EC-CURVE",
    primitive: "key-agreement",
    argIndex: 0,
    note: "Named elliptic curve",
    asCurve: true,
  },
  OAEPParameterSpec: {
    ruleId: "JVM-OAEP-SPEC",
    primitive: "public-key-encryption",
    argIndex: 0,
    note: "RSA-OAEP digest parameters",
  },
};

/** Generators whose strength is set after construction. */
const SIZE_SETTERS = new Set(["initialize", "init"]);

interface VariableBinding {
  readonly factory: string;
  /** Index into `detections` of the call that created it. */
  readonly detectionIndex: number;
}

const isIdent = (t: Token | undefined, value?: string): t is Token =>
  !!t && t.kind === "identifier" && (value === undefined || t.value === value);

const isPunct = (t: Token | undefined, value: string): t is Token =>
  !!t && t.kind === "punct" && t.value === value;

export function detectJvmCrypto(source: string): JvmDetection[] {
  const tokens = tokenizeJava(source);
  const constants = collectStringConstants(tokens);
  const detections: JvmDetection[] = [];
  const bindings = new Map<string, VariableBinding>();
  const curves: { curve: string; index: number }[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;

    // ------------------------------------------- X.getInstance( <arg> , ... )
    if (isIdent(token) && FACTORIES[token.value] && isPunct(tokens[i + 1], ".")) {
      const factory = FACTORIES[token.value]!;
      const method = tokens[i + 2];
      if (isIdent(method, "getInstance") && isPunct(tokens[i + 3], "(")) {
        const resolved = resolveArgument(tokens[i + 4], constants);
        const detection = buildDetection({
          ruleId: factory.ruleId,
          primitive: factory.primitive,
          note: factory.note,
          resolved,
          token,
          provider: readProviderArgument(tokens, i + 4, constants),
        });
        detections.push(detection);
        const varName = declaredVariableName(tokens, i);
        if (varName) bindings.set(varName, { factory: token.value, detectionIndex: detections.length - 1 });
        i += 4;
        continue;
      }
    }

    // ------------------------------------------------ new Something( "ALG" )
    if (token.kind === "keyword" && token.value === "new" && isIdent(tokens[i + 1])) {
      const ctorName = tokens[i + 1]!.value;
      const rule = CONSTRUCTOR_RULES[ctorName];
      if (rule && isPunct(tokens[i + 2], "(")) {
        const arg = nthArgumentToken(tokens, i + 2, rule.argIndex);
        const resolved = resolveArgument(arg, constants);
        if (resolved.value !== undefined) {
          if (rule.asCurve) {
            detections.push({
              ruleId: rule.ruleId,
              algorithmRaw: resolved.value,
              algorithm: "ECDH",
              primitive: rule.primitive,
              parameters: { curve: resolved.value, keySize: curveBits(resolved.value) },
              line: token.line,
              column: token.column,
              confidence: resolved.confidence,
              ambiguity: resolved.ambiguity,
              note: rule.note,
            });
            curves.push({ curve: resolved.value, index: detections.length - 1 });
          } else {
            detections.push(
              buildDetection({
                ruleId: rule.ruleId,
                primitive: rule.primitive,
                note: rule.note,
                resolved,
                token,
              }),
            );
          }
        }
        continue;
      }
    }

    // ------------------------------------- <generator>.initialize( 2048 | spec )
    if (isIdent(token) && bindings.has(token.value) && isPunct(tokens[i + 1], ".")) {
      const method = tokens[i + 2];
      if (method && method.kind === "identifier" && SIZE_SETTERS.has(method.value) && isPunct(tokens[i + 3], "(")) {
        const arg = tokens[i + 4];
        const binding = bindings.get(token.value)!;
        const size = resolveNumber(arg, constants);
        if (size !== undefined) {
          detections[binding.detectionIndex] = withKeySize(detections[binding.detectionIndex]!, size);
        } else if (isIdent(arg)) {
          // `kpg.initialize(ecSpec)` — attach the curve declared in this file.
          const curve = curves.at(-1);
          if (curve) {
            detections[binding.detectionIndex] = withCurve(
              detections[binding.detectionIndex]!,
              curve.curve,
            );
          }
        }
      }
    }
  }

  return detections;
}

interface ResolvedArgument {
  readonly value?: string;
  readonly confidence: number;
  readonly ambiguity: readonly AmbiguityReason[];
}

function resolveArgument(
  token: Token | undefined,
  constants: Map<string, string>,
): ResolvedArgument {
  if (!token) return { confidence: 0.3, ambiguity: ["indirect-algorithm"] };
  if (token.kind === "string") return { value: token.value, confidence: 0.95, ambiguity: [] };
  if (token.kind === "identifier") {
    const constant = constants.get(token.value);
    if (constant !== undefined) {
      return { value: constant, confidence: 0.88, ambiguity: [] };
    }
    return {
      value: `<${token.value}>`,
      confidence: 0.4,
      ambiguity: ["indirect-algorithm", "configurable-at-runtime"],
    };
  }
  return { confidence: 0.35, ambiguity: ["indirect-algorithm"] };
}

function buildDetection(input: {
  ruleId: string;
  primitive: CryptoPrimitive;
  note: string;
  resolved: ResolvedArgument;
  token: Token;
  provider?: string;
}): JvmDetection {
  const raw = input.resolved.value ?? "<unresolved>";
  const dynamic = raw.startsWith("<");
  const parsed = dynamic ? undefined : parseTransformation(raw);
  const parameters: CryptoParameters = {
    ...(parsed?.mode ? { mode: parsed.mode } : {}),
    ...(parsed?.padding ? { padding: parsed.padding } : {}),
    ...(parsed?.digest ? { digest: parsed.digest } : {}),
    ...(input.provider ? { provider: input.provider } : {}),
  };
  return {
    ruleId: input.ruleId,
    algorithmRaw: raw,
    algorithm: parsed?.algorithm ?? "UNRESOLVED",
    primitive: parsed?.entry?.primitive ?? input.primitive,
    parameters,
    line: input.token.line,
    column: input.token.column,
    confidence: input.resolved.confidence,
    ambiguity: input.resolved.ambiguity,
    note: input.note,
  };
}

function withKeySize(detection: JvmDetection, keySize: number): JvmDetection {
  return { ...detection, parameters: { ...detection.parameters, keySize } };
}

function withCurve(detection: JvmDetection, curve: string): JvmDetection {
  return {
    ...detection,
    parameters: { ...detection.parameters, curve, keySize: curveBits(curve) },
  };
}

/** Collects `static final String NAME = "value"` declarations for resolution. */
function collectStringConstants(tokens: Token[]): Map<string, string> {
  const constants = new Map<string, string>();
  for (let i = 0; i < tokens.length - 4; i++) {
    const isStringDecl =
      isIdent(tokens[i], "String") &&
      isIdent(tokens[i + 1]) &&
      isPunct(tokens[i + 2], "=") &&
      tokens[i + 3]?.kind === "string";
    if (isStringDecl) {
      constants.set(tokens[i + 1]!.value, tokens[i + 3]!.value);
      continue;
    }
    const isIntDecl =
      tokens[i]?.kind === "keyword" &&
      ["int", "long", "short"].includes(tokens[i]!.value) &&
      isIdent(tokens[i + 1]) &&
      isPunct(tokens[i + 2], "=") &&
      tokens[i + 3]?.kind === "number";
    if (isIntDecl) {
      constants.set(tokens[i + 1]!.value, tokens[i + 3]!.value);
    }
  }
  return constants;
}

/** The variable a `getInstance` result is assigned to, if any. */
function declaredVariableName(tokens: Token[], factoryIndex: number): string | undefined {
  // `Type name = Factory.getInstance(...)` — walk back over `=` and the name.
  const eq = tokens[factoryIndex - 1];
  const name = tokens[factoryIndex - 2];
  if (isPunct(eq, "=") && isIdent(name)) return name.value;
  return undefined;
}

/** `getInstance("AES", "BC")` — the second argument names a JCE provider. */
function readProviderArgument(
  tokens: Token[],
  firstArgIndex: number,
  constants: Map<string, string>,
): string | undefined {
  const comma = tokens[firstArgIndex + 1];
  if (!isPunct(comma, ",")) return undefined;
  const resolved = resolveArgument(tokens[firstArgIndex + 2], constants);
  return resolved.value?.startsWith("<") ? undefined : resolved.value;
}

/** Token of the nth comma-separated argument, counting from an opening paren. */
function nthArgumentToken(tokens: Token[], openParenIndex: number, n: number): Token | undefined {
  let depth = 0;
  let argument = 0;
  for (let i = openParenIndex; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (isPunct(t, "(")) {
      depth++;
      if (depth === 1 && n === 0) return tokens[i + 1];
      continue;
    }
    if (isPunct(t, ")")) {
      depth--;
      if (depth === 0) return undefined;
      continue;
    }
    if (depth === 1 && isPunct(t, ",")) {
      argument++;
      if (argument === n) return tokens[i + 1];
    }
  }
  return undefined;
}

function resolveNumber(token: Token | undefined, constants: Map<string, string>): number | undefined {
  if (!token) return undefined;
  const raw =
    token.kind === "number"
      ? token.value
      : token.kind === "identifier"
        ? constants.get(token.value)
        : undefined;
  if (raw === undefined) return undefined;
  const parsed = Number.parseInt(raw.replace(/[_lLfFdD]/g, ""), 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Field size of a named curve, in bits — the number everyone calls the key size.
 *
 * Not the security strength: secp256r1 is a 256-bit curve offering 128 bits of
 * classical strength. Reporting 128 here would read as a 128-bit key, which is
 * a different and wrong claim. Strength is derived downstream where it is
 * needed, from this.
 */
function curveBits(curve: string): number | undefined {
  const name = curve.toLowerCase();
  if (name.includes("25519")) return 255;
  if (name.includes("448")) return 448;
  const match = /(\d{3,4})/.exec(curve);
  if (!match) return undefined;
  const bits = Number.parseInt(match[1]!, 10);
  return Number.isNaN(bits) ? undefined : bits;
}
