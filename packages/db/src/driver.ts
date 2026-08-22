/**
 * The database seam.
 *
 * Production runs Aurora PostgreSQL through `pg`. Tests and local development
 * run PGlite — real PostgreSQL compiled to WebAssembly, in-process — so the
 * same SQL is exercised everywhere without a container. Two drivers, one
 * dialect, no mocks.
 */

import { SCHEMA_SQL } from "./schema.js";

export interface QueryResult<T> {
  readonly rows: T[];
  readonly rowCount: number;
}

export interface Database {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  close(): Promise<void>;
}

export async function createPostgres(connectionString: string): Promise<Database> {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    // Aurora terminates idle connections; fail fast rather than hang a request.
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ...(connectionString.includes("localhost") ? {} : { ssl: { rejectUnauthorized: true } }),
  });

  return {
    async query<T>(sql: string, params: unknown[] = []) {
      const result = await pool.query(sql, params);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async close() {
      await pool.end();
    },
  };
}

export async function createEmbedded(dataDir?: string): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = dataDir ? new PGlite(dataDir) : new PGlite();

  return {
    async query<T>(sql: string, params: unknown[] = []) {
      const result = await db.query(sql, params as never[]);
      return { rows: (result.rows ?? []) as T[], rowCount: result.rows?.length ?? 0 };
    },
    async close() {
      await db.close();
    },
  };
}

/** Picks a driver from the environment: DATABASE_URL, else embedded. */
export async function createDatabase(env: NodeJS.ProcessEnv = process.env): Promise<Database> {
  const url = env["DATABASE_URL"];
  if (url) return createPostgres(url);
  return createEmbedded(env["IRONBASTION_DATA_DIR"]);
}

export async function migrate(db: Database): Promise<void> {
  // PGlite executes one statement per call, so split on the statement boundary.
  const statements = SCHEMA_SQL.split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await db.query(statement);
  }
}
