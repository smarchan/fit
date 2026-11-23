import "server-only";
import { neon } from "@neondatabase/serverless";
import { SCHEMA } from "./schema";

/** Minimal database interface, so the repo can run on Neon in production and PGlite in local development. */
export interface Db {
  query(text: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
}

let cached: Promise<Db> | null = null;

export function getDb(): Promise<Db> {
  if (cached) return cached;
  cached = (async () => {
    const db = process.env.DATABASE_URL ? neonDb(process.env.DATABASE_URL) : await devDb();
    for (const stmt of SCHEMA) await db.query(stmt);
    return db;
  })().catch((e) => {
    cached = null;
    throw e;
  });
  return cached;
}

function neonDb(url: string): Db {
  const sql = neon(url);
  return { query: (text, params = []) => sql.query(text, params) as Promise<Record<string, unknown>[]> };
}

/** In-process Postgres for `next dev` without DATABASE_URL. Never used in production. */
async function devDb(): Promise<Db> {
  if (process.env.NODE_ENV !== "development") throw new Error("Falta DATABASE_URL");
  const g = globalThis as unknown as { __pglite?: Db };
  if (g.__pglite) return g.__pglite;
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite(process.env.PGLITE_DIR || "./.pglite");
  g.__pglite = { query: async (text, params = []) => (await pg.query(text, params)).rows as Record<string, unknown>[] };
  return g.__pglite;
}
