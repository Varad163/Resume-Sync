/**
 * GitHub App authentication and API integration module.
 *
 * Implements GitHub App RS256 JWT signing, Installation Access Token generation,
 * CSRF state validation, and tenant-scoped repository/branch discovery.
 */

import crypto from "node:crypto";

export interface GithubAppConfig {
  readonly appId: string;
  readonly privateKey: string;
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly appName?: string;
  readonly appSlug?: string;
}

export interface GithubRepoInfo {
  readonly id: number;
  readonly name: string;
  readonly fullName: string;
  readonly owner: string;
  readonly defaultBranch: string;
  readonly private: boolean;
  readonly cloneUrl: string;
  readonly htmlUrl: string;
}

export interface GithubBranchInfo {
  readonly name: string;
  readonly commitSha: string;
  readonly isDefault: boolean;
}

/** Converts a GitHub App display name or input string into a URL-friendly GitHub App slug. */
export function toGithubAppSlug(nameOrSlug?: string): string {
  if (!nameOrSlug) return "ironbastion-app";
  const slugified = nameOrSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slugified || "ironbastion-app";
}

/** Parses GitHub App configuration from process environment variables. */
export function getGithubAppConfigFromEnv(env: Record<string, string | undefined> = process.env): GithubAppConfig | null {
  const appId = env["GITHUB_APP_ID"];
  const rawKey = env["GITHUB_APP_PRIVATE_KEY"];

  if (!appId || !rawKey) {
    return null;
  }

  // Handle Base64-encoded or raw PEM private key
  let privateKey = rawKey.trim();
  if (!privateKey.startsWith("-----BEGIN")) {
    try {
      privateKey = Buffer.from(privateKey, "base64").toString("utf-8").trim();
    } catch {
      // Use as-is if decoding fails
    }
  }

  const appName = env["GITHUB_APP_NAME"]?.trim();
  const rawSlug = env["GITHUB_APP_SLUG"]?.trim();
  const appSlug = rawSlug || toGithubAppSlug(appName);

  return {
    appId: appId.trim(),
    privateKey,
    clientId: env["GITHUB_APP_CLIENT_ID"]?.trim(),
    clientSecret: env["GITHUB_APP_CLIENT_SECRET"]?.trim(),
    appName: appName || rawSlug || "IronBastion App",
    appSlug,
  };
}

/** Checks whether GitHub App environment variables are configured. */
export function isGithubAppConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return getGithubAppConfigFromEnv(env) !== null;
}

/** Generates a RS256 JWT for GitHub App authentication (valid for 10 minutes). */
export function createAppJwt(config: GithubAppConfig): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iat: now - 60,
    exp: now + 600,
    iss: config.appId,
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const unsigned = `${b64Header}.${b64Payload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(config.privateKey, "base64url");

  return `${unsigned}.${signature}`;
}

/** Creates an HMAC-SHA256 signed CSRF state token encoding the tenant ID. */
export function createStateToken(tenantId: string, secret: string): string {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = `${tenantId}:${timestamp}:${nonce}`;
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const data = JSON.stringify({ tenantId, timestamp, nonce, hmac });
  return Buffer.from(data).toString("base64url");
}

/** Verifies a CSRF state token signature and checks timestamp freshness (15 minute expiration). */
export function verifyStateToken(stateToken: string, secret: string): { tenantId: string } | null {
  try {
    const raw = Buffer.from(stateToken, "base64url").toString("utf-8");
    const parsed = JSON.parse(raw) as { tenantId: string; timestamp: string; nonce: string; hmac: string };
    const { tenantId, timestamp, nonce, hmac } = parsed;

    if (!tenantId || !timestamp || !nonce || !hmac) return null;

    // Check expiration (15 minutes)
    const ageMs = Date.now() - Number.parseInt(timestamp, 10);
    if (Number.isNaN(ageMs) || ageMs < 0 || ageMs > 15 * 60 * 1000) {
      return null;
    }

    const payload = `${tenantId}:${timestamp}:${nonce}`;
    const expectedHmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      return null;
    }

    return { tenantId };
  } catch {
    return null;
  }
}

/** Obtains a short-lived Installation Access Token for a GitHub App installation. */
export async function getInstallationAccessToken(
  config: GithubAppConfig,
  installationId: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ token: string; expiresAt: string }> {
  const jwt = createAppJwt(config);
  const response = await fetchFn(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${jwt}`,
      "User-Agent": "IronBastion-Platform",
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to obtain GitHub installation access token (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { token: string; expires_at: string };
  return { token: data.token, expiresAt: data.expires_at };
}

/** Fetches installation details (account login, type) from GitHub API. */
export async function fetchInstallationDetails(
  config: GithubAppConfig,
  installationId: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ id: string; account: { login: string; type: string } }> {
  const jwt = createAppJwt(config);
  const response = await fetchFn(`https://api.github.com/app/installations/${installationId}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${jwt}`,
      "User-Agent": "IronBastion-Platform",
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch GitHub installation details (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { id: number; account: { login: string; type: string } };
  return {
    id: String(data.id),
    account: {
      login: data.account.login,
      type: data.account.type,
    },
  };
}

/** Lists active GitHub App installations using the App JWT. */
export async function listAppInstallations(
  config: GithubAppConfig,
  fetchFn: typeof fetch = fetch,
): Promise<Array<{ id: string; account: { login: string; type: string } }>> {
  const jwt = createAppJwt(config);
  const response = await fetchFn("https://api.github.com/app/installations", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${jwt}`,
      "User-Agent": "IronBastion-Platform",
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to list GitHub App installations (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as Array<{ id: number; account: { login: string; type: string } }>;
  return (data ?? []).map((item) => ({
    id: String(item.id),
    account: {
      login: item.account?.login ?? "",
      type: item.account?.type ?? "User",
    },
  }));
}

/** Lists repositories accessible to the GitHub App installation. */
export async function listInstallationRepositories(
  config: GithubAppConfig,
  installationId: string,
  fetchFn: typeof fetch = fetch,
): Promise<GithubRepoInfo[]> {
  const { token } = await getInstallationAccessToken(config, installationId, fetchFn);
  const response = await fetchFn("https://api.github.com/installation/repositories?per_page=100", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "IronBastion-Platform",
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to list GitHub repositories (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as {
    repositories: Array<{
      id: number;
      name: string;
      full_name: string;
      owner: { login: string };
      default_branch: string;
      private: boolean;
      clone_url: string;
      html_url: string;
    }>;
  };

  return (data.repositories ?? []).map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    defaultBranch: repo.default_branch || "main",
    private: repo.private,
    cloneUrl: repo.clone_url,
    htmlUrl: repo.html_url,
  }));
}

/** Lists branches for a repository accessible to the GitHub App installation. */
export async function listRepositoryBranches(
  config: GithubAppConfig,
  installationId: string,
  owner: string,
  repo: string,
  fetchFn: typeof fetch = fetch,
): Promise<GithubBranchInfo[]> {
  const { token } = await getInstallationAccessToken(config, installationId, fetchFn);
  const response = await fetchFn(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "IronBastion-Platform",
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to list branches for ${owner}/${repo} (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as Array<{
    name: string;
    commit: { sha: string };
  }>;

  return (data ?? []).map((b) => ({
    name: b.name,
    commitSha: b.commit?.sha || "",
    isDefault: false,
  }));
}
