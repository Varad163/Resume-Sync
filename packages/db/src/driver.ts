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
  transaction?<T>(fn: (tx: Database) => Promise<T>): Promise<T>;
}

export async function createPostgres(connectionString: string): Promise<Database> {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ...(connectionString.includes("localhost") ? {} : { ssl: { rejectUnauthorized: true } }),
  });

  const db: Database = {
    async query<T>(sql: string, params: unknown[] = []) {
      const result = await pool.query(sql, params);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async close() {
      await pool.end();
    },
    async transaction<T>(fn: (tx: Database) => Promise<T>) {
      const client = await pool.connect();
      const txDb: Database = {
        async query<R>(sql: string, params: unknown[] = []) {
          const result = await client.query(sql, params);
          return { rows: result.rows as R[], rowCount: result.rowCount ?? 0 };
        },
        async close() {
          // No-op inside transaction
        },
      };
      await txDb.query("BEGIN");
      try {
        const result = await fn(txDb);
        await txDb.query("COMMIT");
        return result;
      } catch (error) {
        await txDb.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
  return db;
}

export async function createEmbedded(dataDir?: string): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dbClient = dataDir ? new PGlite(dataDir) : new PGlite();

  const db: Database = {
    async query<T>(sql: string, params: unknown[] = []) {
      const result = await dbClient.query(sql, params as never[]);
      return { rows: (result.rows ?? []) as T[], rowCount: result.rows?.length ?? 0 };
    },
    async close() {
      await dbClient.close();
    },
    async transaction<T>(fn: (tx: Database) => Promise<T>) {
      await this.query("BEGIN");
      try {
        const result = await fn(this);
        await this.query("COMMIT");
        return result;
      } catch (error) {
        await this.query("ROLLBACK");
        throw error;
      }
    },
  };
  return db;
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

export async function runInTenantTransaction<T>(
  db: Database,
  tenantId: string,
  fn: (tx: Database) => Promise<T>,
): Promise<T> {
  const runTx = db.transaction
    ? (f: (tx: Database) => Promise<T>) => db.transaction!(f)
    : async (f: (tx: Database) => Promise<T>) => {
        await db.query("BEGIN");
        try {
          const res = await f(db);
          await db.query("COMMIT");
          return res;
        } catch (err) {
          await db.query("ROLLBACK");
          throw err;
        }
      };

  return await runTx(async (tx) => {
    await tx.query("SELECT set_config('ironbastion.current_tenant_id', $1, true)", [tenantId]);
    return await fn(tx);
  });
}
