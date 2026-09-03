import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import {
  createAppJwt,
  createStateToken,
  verifyStateToken,
  getGithubAppConfigFromEnv,
  isGithubAppConfigured,
  type GithubAppConfig,
} from "./github.js";

describe("GitHub App Core Integration", () => {
  // Generate a temporary RSA keypair for JWT testing
  const { privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const testConfig: GithubAppConfig = {
    appId: "123456",
    privateKey,
    appName: "test-ironbastion-app",
  };

  const secret = "test-secret-key-32-chars-long!!";

  it("detects GitHub App environment variables correctly", () => {
    const envConfigured = {
      GITHUB_APP_ID: "999888",
      GITHUB_APP_PRIVATE_KEY: privateKey,
      GITHUB_APP_NAME: "my-custom-app",
    };
    expect(isGithubAppConfigured(envConfigured)).toBe(true);

    const config = getGithubAppConfigFromEnv(envConfigured);
    expect(config?.appId).toBe("999888");
    expect(config?.appName).toBe("my-custom-app");

    expect(isGithubAppConfigured({})).toBe(false);
  });

  it("generates a valid RS256 JWT header and signature", () => {
    const jwt = createAppJwt(testConfig);
    const parts = jwt.split(".");
    expect(parts.length).toBe(3);

    const header = JSON.parse(Buffer.from(parts[0]!, "base64url").toString("utf-8"));
    const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf-8"));

    expect(header.alg).toBe("RS256");
    expect(header.typ).toBe("JWT");
    expect(payload.iss).toBe("123456");
    expect(payload.exp - payload.iat).toBe(660);
  });

  it("creates and verifies CSRF state tokens securely", () => {
    const tenantId = "tnt_acme123";
    const stateToken = createStateToken(tenantId, secret);

    const verified = verifyStateToken(stateToken, secret);
    expect(verified).not.toBeNull();
    expect(verified?.tenantId).toBe(tenantId);
  });

  it("rejects state tokens signed with invalid secret or corrupted payload", () => {
    const tenantId = "tnt_acme123";
    const stateToken = createStateToken(tenantId, secret);

    // Wrong secret
    expect(verifyStateToken(stateToken, "wrong-secret-key")).toBeNull();

    // Corrupted state string
    expect(verifyStateToken("invalid-base64url-string", secret)).toBeNull();
  });
});
