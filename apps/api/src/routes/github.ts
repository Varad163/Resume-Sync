/**
 * Fastify route plugin for GitHub App integration.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  getGithubAppConfigFromEnv,
  toGithubAppSlug,
  createStateToken,
  verifyStateToken,
  fetchInstallationDetails,
  listInstallationRepositories,
  listRepositoryBranches,
} from "@ironbastion/core";
import {
  saveGithubInstallation,
  getGithubInstallation,
  deleteGithubInstallation,
  recordAudit,
  runInTenantTransaction,
  type Database,
} from "@ironbastion/db";
import { AuthError, type Principal } from "../auth.js";
import type { ServerDeps } from "../server.js";

function must(request: FastifyRequest): Principal {
  if (!request.principal) throw new AuthError("unauthorised");
  return request.principal;
}

export async function registerGithubIntegrationRoutes(app: FastifyInstance, deps: ServerDeps): Promise<void> {
  const secret = process.env["IRONBASTION_SESSION_SECRET"] ?? "ironbastion-dev-secret-key-32-chars";

  const runTx = <T>(request: FastifyRequest, fn: (tx: Database) => Promise<T>): Promise<T> => {
    const principal = must(request);
    return runInTenantTransaction(deps.db, principal.tenantId, fn);
  };

  // ------------------------------------------------------------------ GET /v1/integrations/github/connect
  app.get("/v1/integrations/github/connect", async (request: FastifyRequest, reply: FastifyReply) => {
    const principal = must(request);
    const config = getGithubAppConfigFromEnv();

    if (!config) {
      return reply.code(400).send({
        configured: false,
        error: "GitHub App is not configured on the server. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY.",
      });
    }

    const state = createStateToken(principal.tenantId, secret);
    const slug = config.appSlug || toGithubAppSlug(config.appName);
    const url = `https://github.com/apps/${encodeURIComponent(slug)}/installations/new?state=${encodeURIComponent(state)}`;

    return reply.send({ configured: true, url, state });
  });

  // ------------------------------------------------------------------ GET /v1/integrations/github/callback
  app.get("/v1/integrations/github/callback", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.query as { state?: string; installation_id?: string; setup_action?: string }) ?? {};
    const { state, installation_id: installationId } = query;

    if (!state) {
      return reply.code(400).send({ error: "Missing state parameter in GitHub callback" });
    }

    const verified = verifyStateToken(state, secret);
    if (!verified) {
      return reply.code(400).send({ error: "Invalid or expired state parameter" });
    }

    const tenantId = verified.tenantId;
    const config = getGithubAppConfigFromEnv();

    if (!config) {
      return reply.code(500).send({ error: "GitHub App is not configured" });
    }

    if (!installationId) {
      return reply.code(400).send({ error: "Missing installation_id in GitHub callback" });
    }

    try {
      const details = await fetchInstallationDetails(config, installationId);

      await runInTenantTransaction(deps.db, tenantId, async (tx) => {
        await saveGithubInstallation(tx, tenantId, {
          githubInstallationId: details.id,
          accountLogin: details.account.login,
          accountType: details.account.type,
        });

        await recordAudit(tx, {
          tenantId,
          actor: request.principal?.email ?? "github-oauth",
          action: "github.connect",
          subject: details.id,
          detail: { accountLogin: details.account.login, accountType: details.account.type },
        });
      });

      // If requested via browser popup, send postMessage script to notify window opener
      const acceptHeader = request.headers.accept || "";
      if (acceptHeader.includes("text/html")) {
        reply.header("Content-Type", "text/html");
        return reply.send(`<!DOCTYPE html>
<html>
<head><title>GitHub Connected</title></head>
<body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
  <div style="text-align: center; background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #334155;">
    <h2 style="color: #10b981; margin-top: 0;">✓ GitHub Connected Successfully</h2>
    <p>Connected to <strong>${details.account.login}</strong>.</p>
    <p style="color: #94a3b8; font-size: 0.875rem;">You may close this window or wait to be redirected.</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: "IRONBASTION_GITHUB_CONNECTED", account: "${details.account.login}" }, "*");
      setTimeout(() => window.close(), 1500);
    } else {
      setTimeout(() => { window.location.href = "/"; }, 2000);
    }
  </script>
</body>
</html>`);
      }

      return reply.send({
        success: true,
        tenantId,
        installationId: details.id,
        accountLogin: details.account.login,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "GitHub installation verification failed";
      return reply.code(400).send({ error: message });
    }
  });

  // ------------------------------------------------------------------ GET /v1/integrations/github/status
  app.get("/v1/integrations/github/status", async (request: FastifyRequest, reply: FastifyReply) => {
    const principal = must(request);
    const config = getGithubAppConfigFromEnv();

    const installation = await runTx(request, (tx) => getGithubInstallation(tx, principal.tenantId));

    return reply.send({
      configured: Boolean(config),
      appName: config?.appName ?? null,
      connected: Boolean(installation),
      installation: installation ?? null,
    });
  });

  // ------------------------------------------------------------------ DELETE /v1/integrations/github
  app.delete("/v1/integrations/github", async (request: FastifyRequest, reply: FastifyReply) => {
    const principal = must(request);

    await runTx(request, async (tx) => {
      const existing = await getGithubInstallation(tx, principal.tenantId);
      if (existing) {
        await deleteGithubInstallation(tx, principal.tenantId, existing.githubInstallationId);
        await recordAudit(tx, {
          tenantId: principal.tenantId,
          actor: principal.email,
          action: "github.disconnect",
          subject: existing.githubInstallationId,
          detail: { accountLogin: existing.accountLogin },
        });
      }
    });

    return reply.send({ success: true });
  });

  // ------------------------------------------------------------------ GET /v1/integrations/github/repositories
  app.get("/v1/integrations/github/repositories", async (request: FastifyRequest, reply: FastifyReply) => {
    const principal = must(request);
    const config = getGithubAppConfigFromEnv();

    if (!config) {
      return reply.code(400).send({ error: "GitHub App is not configured on the server" });
    }

    const installation = await runTx(request, (tx) => getGithubInstallation(tx, principal.tenantId));
    if (!installation) {
      return reply.code(400).send({ error: "GitHub is not connected for this tenant" });
    }

    try {
      const repositories = await listInstallationRepositories(config, installation.githubInstallationId);
      return reply.send({ repositories });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to list repositories";
      return reply.code(502).send({ error: message });
    }
  });

  // ------------------------------------------------------------------ GET /v1/integrations/github/repositories/:owner/:repo/branches
  app.get(
    "/v1/integrations/github/repositories/:owner/:repo/branches",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const principal = must(request);
      const { owner, repo } = request.params as { owner: string; repo: string };
      const config = getGithubAppConfigFromEnv();

      if (!config) {
        return reply.code(400).send({ error: "GitHub App is not configured on the server" });
      }

      const installation = await runTx(request, (tx) => getGithubInstallation(tx, principal.tenantId));
      if (!installation) {
        return reply.code(400).send({ error: "GitHub is not connected for this tenant" });
      }

      try {
        const branches = await listRepositoryBranches(config, installation.githubInstallationId, owner, repo);
        return reply.send({ branches });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to list repository branches";
        return reply.code(502).send({ error: message });
      }
    },
  );
}
