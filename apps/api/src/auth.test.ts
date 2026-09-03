import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { AuthError, createAuthenticator } from "./auth.js";

const REGION = "us-east-1";
const POOL_ID = "us-east-1_TestPool123";
const CLIENT_ID = "client_app_456";
const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${POOL_ID}`;

async function setupTestKeys() {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = "test-key-id";
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";

  const keySet = async () => publicKey;
  return { privateKey, keySet };
}

describe("Production Authentication (Cognito mode)", () => {
  const env: NodeJS.ProcessEnv = {
    COGNITO_USER_POOL_ID: POOL_ID,
    AWS_REGION: REGION,
    COGNITO_CLIENT_ID: CLIENT_ID,
  };

  it("verifies a valid production Cognito JWT and extracts principal", async () => {
    const { privateKey, keySet } = await setupTestKeys();
    const authenticator = createAuthenticator(env, { jwks: keySet });

    const jwt = await new SignJWT({
      "custom:tenant_id": "tnt_acme",
      "email": "alice@acme.com",
      "custom:role": "owner",
      "token_use": "id",
    })
      .setProtectedHeader({ alg: "RS256", kid: "test-key-id" })
      .setIssuer(ISSUER)
      .setAudience(CLIENT_ID)
      .setSubject("usr_123")
      .setExpirationTime("1h")
      .setIssuedAt()
      .sign(privateKey);

    const principal = await authenticator.verify(`Bearer ${jwt}`);
    expect(principal).toEqual({
      tenantId: "tnt_acme",
      userId: "usr_123",
      email: "alice@acme.com",
      role: "owner",
    });
  });

  it("rejects an unauthenticated request with missing or empty Bearer token", async () => {
    const { keySet } = await setupTestKeys();
    const authenticator = createAuthenticator(env, { jwks: keySet });

    await expect(authenticator.verify(undefined)).rejects.toThrow(AuthError);
    await expect(authenticator.verify("Bearer ")).rejects.toThrow("empty bearer token");
    await expect(authenticator.verify("Basic token")).rejects.toThrow("missing bearer token");
  });

  it("rejects an invalid or malformed JWT", async () => {
    const { keySet } = await setupTestKeys();
    const authenticator = createAuthenticator(env, { jwks: keySet });

    await expect(authenticator.verify("Bearer invalid.jwt.string")).rejects.toThrow(AuthError);
  });

  it("rejects an expired JWT", async () => {
    const { privateKey, keySet } = await setupTestKeys();
    const authenticator = createAuthenticator(env, { jwks: keySet });

    const jwt = await new SignJWT({
      "custom:tenant_id": "tnt_acme",
      "email": "alice@acme.com",
      "token_use": "id",
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(ISSUER)
      .setAudience(CLIENT_ID)
      .setExpirationTime("-10s")
      .sign(privateKey);

    await expect(authenticator.verify(`Bearer ${jwt}`)).rejects.toThrow(/token rejected/);
  });

  it("rejects a JWT signed by a wrong issuer", async () => {
    const { privateKey, keySet } = await setupTestKeys();
    const authenticator = createAuthenticator(env, { jwks: keySet });

    const jwt = await new SignJWT({
      "custom:tenant_id": "tnt_acme",
      "email": "alice@acme.com",
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer("https://wrong-issuer.com")
      .setAudience(CLIENT_ID)
      .setExpirationTime("1h")
      .sign(privateKey);

    await expect(authenticator.verify(`Bearer ${jwt}`)).rejects.toThrow(/token rejected/);
  });

  it("rejects a JWT with wrong audience / client_id", async () => {
    const { privateKey, keySet } = await setupTestKeys();
    const authenticator = createAuthenticator(env, { jwks: keySet });

    const jwt = await new SignJWT({
      "custom:tenant_id": "tnt_acme",
      "email": "alice@acme.com",
      "token_use": "id",
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(ISSUER)
      .setAudience("wrong_client_id")
      .setExpirationTime("1h")
      .sign(privateKey);

    await expect(authenticator.verify(`Bearer ${jwt}`)).rejects.toThrow(/audience or client_id mismatch/);
  });

  it("rejects a JWT that carries no custom:tenant_id claim", async () => {
    const { privateKey, keySet } = await setupTestKeys();
    const authenticator = createAuthenticator(env, { jwks: keySet });

    const jwt = await new SignJWT({
      email: "alice@acme.com",
      token_use: "id",
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(ISSUER)
      .setAudience(CLIENT_ID)
      .setExpirationTime("1h")
      .sign(privateKey);

    await expect(authenticator.verify(`Bearer ${jwt}`)).rejects.toThrow("token carries no tenant");
  });

  it("rejects dev tokens in production Cognito mode", async () => {
    const { keySet } = await setupTestKeys();
    const authenticator = createAuthenticator(env, { jwks: keySet });

    await expect(authenticator.verify("Bearer dev.tnt_acme.alice@acme.com")).rejects.toThrow(/token rejected/);
  });
});

describe("Development Authentication (IRONBASTION_AUTH=dev)", () => {
  it("allows dev tokens ONLY when IRONBASTION_AUTH=dev is explicitly set", async () => {
    const devEnv: NodeJS.ProcessEnv = { IRONBASTION_AUTH: "dev" };
    const authenticator = createAuthenticator(devEnv);

    expect(authenticator.mode).toBe("dev");
    const principal = await authenticator.verify("Bearer dev.tnt_dev.dev@test.com");
    expect(principal).toEqual({
      tenantId: "tnt_dev",
      userId: "dev:dev@test.com",
      email: "dev@test.com",
      role: "owner",
    });
  });

  it("throws configuration error if neither IRONBASTION_AUTH=dev nor Cognito variables are set", () => {
    expect(() => createAuthenticator({} as NodeJS.ProcessEnv)).toThrow(
      "COGNITO_USER_POOL_ID and AWS_REGION are required",
    );
  });
});
