/**
 * The REST API.
 *
 * Every route resolves a principal first and passes its tenantId into the
 * repositories, which are the only code that writes SQL. Mutating routes write
 * an audit entry. Nothing here formats a finding — the console and the report
 * do that from the same JSON a customer can fetch themselves.
 */

import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { generateCertificateKeys } from "@ironbastion/core";
import type { Database } from "@ironbastion/db";
import type { Queue } from "@ironbastion/runner";
import { AuthError, type Authenticator, type Principal } from "./auth.js";
import { registerAuditRoutes } from "./routes/audit.js";
import { registerCertifyRoutes } from "./routes/certify.js";
import { registerForgeRoutes } from "./routes/forge.js";
import { registerGithubIntegrationRoutes } from "./routes/github.js";
import { registerMigrationRoutes } from "./routes/migration.js";
import { registerProjectRoutes } from "./routes/projects.js";
import { registerScanRoutes } from "./routes/scans.js";
import { registerWatchtowerRoutes } from "./routes/watchtower.js";

export interface ServerDeps {
  readonly db: Database;
  readonly queue: Queue;
  readonly auth: Authenticator;
  readonly version?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    principal?: Principal;
  }
}

export async function createServer(deps: ServerDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, bodyLimit: 1_000_000 });

  const { privateKey, publicKey } = generateCertificateKeys();

  await app.register(cors, {
    origin: process.env["CORS_ORIGIN"]?.split(",") ?? true,
    credentials: true,
  });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
      files: 1,
    },
  });

  app.get("/health", async () => ({
    status: "ok",
    version: deps.version ?? "0.1.0",
    auth: deps.auth.mode,
    queue: deps.queue.id,
  }));

  app.get("/v1/certificate-public-key", async () => {
    return { publicKey };
  });

  // Everything below this hook requires a principal.
  app.addHook("preHandler", async (request, reply) => {
    const rawPath = (request.routeOptions.url ?? request.url).split("?")[0];
    if (
      rawPath === "/health" ||
      rawPath === "/v1/certificate-public-key" ||
      rawPath === "/v1/integrations/github/callback" ||
      request.method === "OPTIONS"
    ) {
      return;
    }
    try {
      request.principal = await deps.auth.verify(request.headers.authorization);
    } catch (error) {
      const message = error instanceof AuthError ? error.message : "unauthorised";
      await reply.code(401).send({ error: "unauthorised", message });
    }
  });

  // Register route modules
  await registerProjectRoutes(app, deps);
  await registerScanRoutes(app, deps);
  await registerWatchtowerRoutes(app, deps);
  await registerMigrationRoutes(app, deps);
  await registerCertifyRoutes(app, deps, privateKey);
  await registerForgeRoutes(app, deps);
  await registerAuditRoutes(app, deps);
  await registerGithubIntegrationRoutes(app, deps);

  app.setErrorHandler(async (error: Error & { statusCode?: number }, _request, reply) => {
    const status = error.statusCode ?? 500;
    await reply.code(status).send({
      error: status === 500 ? "internal error" : error.message,
      ...(status === 500 ? {} : { message: error.message }),
    });
  });

  return app;
}
