import { neon, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as transactionalDrizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@/lib/db/schema";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  return url;
}

export function getDb() {
  return drizzle(neon(getDatabaseUrl()), { schema });
}

type TransactionalDb = ReturnType<typeof transactionalDrizzle<typeof schema>>;
export type FamilyTransaction = Parameters<Parameters<TransactionalDb["transaction"]>[0]>[0];

// Claims and permissions must be checked under the same lock as their writes.
// Node 22+ supplies WebSocket. Close the request-scoped pool on every path.
export async function withTransaction<T>(work: (tx: FamilyTransaction) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: getDatabaseUrl(), connectionTimeoutMillis: 15000 });
  try { return await transactionalDrizzle(pool, { schema }).transaction(work); }
  finally { await pool.end().catch(() => { console.error("Could not close the family database connection."); }); }
}
