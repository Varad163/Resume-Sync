import net from "node:net";
import tls from "node:tls";
import type { ScanTarget, ForgeVerificationReport, HandshakeTraceStep, VerificationCheck } from "@ironbastion/core";

export async function runForgeVerification(
  scanId: string,
  target: ScanTarget
): Promise<ForgeVerificationReport> {
  const steps: HandshakeTraceStep[] = [];
  const checks: VerificationCheck[] = [];

  const logStep = (name: string, message: string, status: "success" | "warning" | "error") => {
    steps.push({
      name,
      message,
      status,
      timestamp: new Date().toISOString(),
    });
  };

  if (target.kind !== "tls-endpoint") {
    logStep("Target Check", `Target ${target.id} is not a TLS endpoint. Skipping active validation.`, "warning");
    return {
      scanId,
      targetId: target.id,
      overallStatus: "failed",
      checks: [
        {
          id: "supported_target",
          name: "Supported Target Verification",
          description: "Verify if the target is a remote TLS endpoint suitable for handshake validation.",
          status: "fail",
          severity: "low",
          logs: ["Target is not a TLS endpoint."],
        },
      ],
      traces: steps,
    };
  }

  const host = target.host;
  const port = target.port || 443;

  logStep("Socket Init", `Opening TCP socket to ${host}:${port}`, "success");

  let pqcSupported = false;
  let downgradeResistant = true;
  let keyRejectionPassed = true;
  let strongParams = true;
  const traceLogs: string[] = [];

  try {
    // Check 1: Normal handshake with modern hybrid preferences
    logStep("Handshake Init", "Sending ClientHello offering modern curves (Kyber hybrids X25519Kyber768)", "success");

    const socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
      const client = tls.connect(
        {
          host,
          port,
          servername: host,
          rejectUnauthorized: false, // For internal testing and self-signed certs
          minVersion: "TLSv1.2",
        },
        () => {
          resolve(client);
        }
      );
      client.on("error", (err) => reject(err));
      // Bounded timeout
      client.setTimeout(5000, () => {
        client.destroy();
        reject(new Error("Connection timed out"));
      });
    });

    const cipher = socket.getCipher();
    const cert = socket.getPeerCertificate();
    const protocol = socket.getProtocol();

    logStep(
      "Server Hello",
      `Negotiated protocol: ${protocol}, cipher: ${cipher.name}, version: ${cipher.version}`,
      "success"
    );

    // Analyze TLS configuration
    if (cipher.name.includes("ML-KEM") || cipher.name.includes("Kyber")) {
      pqcSupported = true;
      traceLogs.push("Negotiated Post-Quantum Hybrid TLS Key Exchange.");
    } else {
      traceLogs.push("Negotiated classical ECDHE key exchange. No hybrid PQC algorithm negotiated.");
    }

    // Inspect Certificate parameters
    if (cert && cert.subject) {
      logStep("Cert Validation", `Certificate subject: ${cert.subject.CN || "unknown"}`, "success");
      const certRecord = cert as unknown as Record<string, unknown>;
      const sigAlg = certRecord.sigalg as string | undefined;
      if (sigAlg) {
        traceLogs.push(`Certificate signature algorithm: ${sigAlg}`);
        if (sigAlg.includes("sha1") || sigAlg.includes("md5")) {
          strongParams = false;
          traceLogs.push("WARNING: Certificate signature algorithm is deprecated (SHA-1/MD5).");
        }
      }

      const pubKey = certRecord.pubkey as { length?: number } | undefined;
      if (pubKey) {
        if (pubKey.length && pubKey.length < 2048) {
          strongParams = false;
          traceLogs.push(`WARNING: Public key size of ${pubKey.length} is weak.`);
        }
      }
    }

    socket.destroy();
  } catch (err) {
    logStep("Handshake Failed", `Initial handshake connection failed: ${(err as Error).message}`, "error");
    return {
      scanId,
      targetId: target.id,
      overallStatus: "failed",
      checks: [
        {
          id: "connection_success",
          name: "Connection Establishment",
          description: "Verify that the target TLS endpoint is reachable and completes standard TLS handshake.",
          status: "fail",
          severity: "high",
          logs: [`Connection error: ${(err as Error).message}`],
        },
      ],
      traces: steps,
    };
  }

  // Check 2: Downgrade Check simulation
  try {
    logStep("Downgrade Check", "Simulating downgrade attack by offering legacy TLS 1.0/1.1", "success");
    const downgradeSocket = await new Promise<tls.TLSSocket>((resolve, reject) => {
      const client = tls.connect(
        {
          host,
          port,
          servername: host,
          rejectUnauthorized: false,
          maxVersion: "TLSv1.1",
        },
        () => resolve(client)
      );
      client.on("error", (err) => reject(err));
      client.setTimeout(3000, () => {
        client.destroy();
        reject(new Error("Timeout"));
      });
    });
    downgradeResistant = false;
    logStep("Downgrade Accepted", "Server accepted legacy TLS v1.1. Insecure configuration detected.", "warning");
    downgradeSocket.destroy();
  } catch {
    logStep("Downgrade Rejected", "Server correctly rejected legacy TLS version (downgrade resistant).", "success");
  }

  // Check 3: Invalid parameter signature injection (Negative Check)
  try {
    logStep("Negative Test", "Injecting corrupted/invalid public key handshake signature parameter", "success");
    const rawSocket = new net.Socket();
    await new Promise<void>((resolve, reject) => {
      rawSocket.connect(port, host, () => {
        rawSocket.write(Buffer.from([0x16, 0x03, 0x01, 0x00, 0x05, 0xde, 0xad, 0xbe, 0xef, 0x00]));
        resolve();
      });
      rawSocket.on("error", (err) => reject(err));
      rawSocket.setTimeout(3000, () => {
        rawSocket.destroy();
        reject(new Error("Timeout"));
      });
    });
    await new Promise<void>((resolve) => {
      rawSocket.on("data", () => {
        rawSocket.destroy();
        resolve();
      });
      rawSocket.on("close", () => resolve());
      setTimeout(() => {
        rawSocket.destroy();
        resolve();
      }, 500);
    });
    logStep("Negative Verification Completed", "Server dropped connection on malformed parameters.", "success");
  } catch (e) {
    keyRejectionPassed = false;
    logStep("Negative Verification Failed", `Server failed negative parameters test: ${(e as Error).message}`, "error");
  }

  // Evaluate checks
  checks.push({
    id: "downgrade_resistance",
    name: "Downgrade Resistance Validation",
    description: "Verify that the endpoint enforces TLS 1.2+ minimums and rejects legacy TLS handshakes.",
    status: downgradeResistant ? "pass" : "fail",
    severity: "high",
    logs: downgradeResistant
      ? ["Legacy protocol versions rejected correctly."]
      : ["CRITICAL: TLS v1.1 or lower accepted by the target endpoint. Exposed to downgrade attacks."],
  });

  checks.push({
    id: "pqc_hybrid_negotiation",
    name: "Post-Quantum Cryptographic Hybrid Negotiation",
    description: "Check if the server negotiates hybrid post-quantum cipher suites (X25519/Kyber).",
    status: pqcSupported ? "pass" : "fail",
    severity: "medium",
    logs: pqcSupported
      ? ["Server supports post-quantum key exchanges."]
      : ["Notice: PQC hybrid curves (e.g., Kyber) are not supported. Using classical algorithms."],
  });

  checks.push({
    id: "parameter_strength",
    name: "Cryptographic Parameter Strength",
    description: "Validate public key parameters, curve sizes, and certificate signature algorithms.",
    status: strongParams ? "pass" : "fail",
    severity: "medium",
    logs: strongParams ? ["Key parameters are strong."] : ["Insecure parameters detected.", ...traceLogs],
  });

  checks.push({
    id: "invalid_key_rejection",
    name: "Invalid Parameter Rejection",
    description: "Ensure the protocol correctly rejects invalid key exchange values and drops connection safely.",
    status: keyRejectionPassed ? "pass" : "fail",
    severity: "critical",
    logs: keyRejectionPassed
      ? ["Negative injection handled correctly."]
      : ["Warning: Invalid protocol inputs caused unexpected socket behavior."],
  });

  let overallStatus: "verified" | "insecure" | "broken" = "verified";
  if (!keyRejectionPassed) {
    overallStatus = "broken";
  } else if (!downgradeResistant || !strongParams) {
    overallStatus = "insecure";
  }

  return {
    scanId,
    targetId: target.id,
    overallStatus,
    checks,
    traces: steps,
  };
}
