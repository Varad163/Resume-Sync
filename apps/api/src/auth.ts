/**
 * Authentication.
 *
 * Production verifies a Cognito access token against the pool's JWKS and takes
 * the tenant from a custom claim. Local development uses a bearer token of the
 * form `dev.<tenantId>.<email>`, which is only ever accepted when
 * IRONBASTION_AUTH is explicitly set to `dev` — it is not a fallback, because a
 * fallback is how a development shortcut ends up deployed.
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export interface Principal {
  readonly tenantId: string;
  readonly userId: string;
  readonly email: string;
  readonly role: "owner" | "member" | "viewer";
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export interface Authenticator {
  readonly mode: "cognito" | "dev";
  verify(authorizationHeader: string | undefined): Promise<Principal>;
}

export function createAuthenticator(env: NodeJS.ProcessEnv = process.env): Authenticator {
  if (env["IRONBASTION_AUTH"] === "dev") return devAuthenticator();

  const userPoolId = env["COGNITO_USER_POOL_ID"];
  const region = env["AWS_REGION"];
  const clientId = env["COGNITO_CLIENT_ID"];
  if (!userPoolId || !region) {
    throw new Error(
      "COGNITO_USER_POOL_ID and AWS_REGION are required. Set IRONBASTION_AUTH=dev for local development.",
    );
  }

  const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

  return {
    mode: "cognito",
    async verify(header) {
      const token = bearer(header);
      let payload: JWTPayload;
      try {
        ({ payload } = await jwtVerify(token, jwks, {
          issuer,
          ...(clientId ? { audience: clientId } : {}),
        }));
      } catch (error) {
        throw new AuthError(`token rejected: ${(error as Error).message}`);
      }

      const tenantId = String(payload["custom:tenant_id"] ?? "");
      const email = String(payload["email"] ?? "");
      if (!tenantId) throw new AuthError("token carries no tenant");

      return {
        tenantId,
        userId: String(payload.sub ?? email),
        email,
        role: normaliseRole(payload["custom:role"]),
      };
    },
  };
}

function devAuthenticator(): Authenticator {
  return {
    mode: "dev",
    async verify(header) {
      const token = bearer(header);
      const [prefix, tenantId, ...rest] = token.split(".");
      if (prefix !== "dev" || !tenantId || rest.length === 0) {
        throw new AuthError("expected a token of the form dev.<tenantId>.<email>");
      }
      const email = rest.join(".");
      return { tenantId, userId: `dev:${email}`, email, role: "owner" };
    },
  };
}

function bearer(header: string | undefined): string {
  if (!header?.startsWith("Bearer ")) throw new AuthError("missing bearer token");
  const token = header.slice("Bearer ".length).trim();
  if (!token) throw new AuthError("empty bearer token");
  return token;
}

function normaliseRole(value: unknown): Principal["role"] {
  return value === "owner" || value === "viewer" ? value : "member";
}
