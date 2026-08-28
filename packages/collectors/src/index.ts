export * from "./shared/types.js";
export * from "./shared/text.js";
export { detectJvmCrypto, type JvmDetection } from "./jvm/rules.js";
export { tokenizeJava, type Token } from "./jvm/tokenizer.js";
export { jvmSourceCollector } from "./jvm/source-collector.js";
export { jvmDependencyCollector } from "./deps/collector.js";
export { npmDependencyCollector } from "./npm/npm-collector.js";
export { pypiDependencyCollector } from "./npm/pypi-collector.js";
export { scanPythonSource, type PythonDetection } from "./python/rules.js";
export { pythonSourceCollector } from "./python/source-collector.js";
export { scanJsSource, type JsDetection } from "./js/rules.js";
export { jsSourceCollector } from "./js/source-collector.js";
export { parsePom, parseGradle, type DeclaredDependency } from "./deps/manifests.js";
export { LIBRARIES, matchLibrary, matchNpmLibrary, matchPypiLibrary, compareVersions } from "./deps/library-registry.js";
export {
  tlsProbeCollector,
  observeHandshake,
  candidatesFromHandshake,
  type HandshakeObservation,
  type CertificateObservation,
} from "./tls/probe.js";
export { decomposeSuite } from "./tls/cipher-suites.js";
export { signatureAlgorithmOf, decodeOid } from "./tls/asn1.js";

import { jvmSourceCollector } from "./jvm/source-collector.js";
import { jvmDependencyCollector } from "./deps/collector.js";
import { npmDependencyCollector } from "./npm/npm-collector.js";
import { pypiDependencyCollector } from "./npm/pypi-collector.js";
import { pythonSourceCollector } from "./python/source-collector.js";
import { jsSourceCollector } from "./js/source-collector.js";
import { tlsProbeCollector } from "./tls/probe.js";
import type { Collector } from "./shared/types.js";

/** Every collector the platform ships, in the order a campaign runs them. */
export const ALL_COLLECTORS: readonly Collector[] = [
  jvmSourceCollector,
  jvmDependencyCollector,
  npmDependencyCollector,
  pypiDependencyCollector,
  pythonSourceCollector,
  jsSourceCollector,
  tlsProbeCollector,
];
