/**
 * Production environment configuration validation.
 *
 * Fails fast with clear error messages if required configuration variables
 * are missing in production mode. Never prints secret values.
 */

export interface AppConfig {
  readonly authMode: "dev" | "cognito";
  readonly userPoolId?: string;
  readonly clientId?: string;
  readonly region: string;
  readonly kmsCertifyKeyArn?: string;
  readonly corsOrigin?: string[];
}

export function validateProductionConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const authMode = env["IRONBASTION_AUTH"] === "dev" ? "dev" : "cognito";
  const region = env["AWS_REGION"] || "us-east-1";

  if (authMode === "cognito") {
    const missing: string[] = [];
    if (!env["COGNITO_USER_POOL_ID"]) missing.push("COGNITO_USER_POOL_ID");
    if (!env["COGNITO_CLIENT_ID"]) missing.push("COGNITO_CLIENT_ID");

    if (missing.length > 0) {
      throw new Error(
        `Missing required production configuration: ${missing.join(", ")}. Set IRONBASTION_AUTH=dev for local development.`
      );
    }
  }

  const corsOrigin = env["CORS_ORIGIN"]?.split(",").map((s) => s.trim());

  return {
    authMode,
    userPoolId: env["COGNITO_USER_POOL_ID"],
    clientId: env["COGNITO_CLIENT_ID"],
    region,
    kmsCertifyKeyArn: env["CERTIFY_KMS_KEY_ARN"],
    corsOrigin,
  };
}
