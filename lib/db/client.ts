import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@/db/schema";
import fs from "fs";
import path from "path";

function ensureEnv() {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  if (!process.env.DATABASE_URL) {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf-8").split("\n");
      for (const line of lines) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) process.env[key] = value;
        }
      }
    }
  }
}

// Global and module-level singleton to guarantee the Neon Pool and Drizzle instance
// are created once and reused across all incoming requests within the serverless container execution context.
const globalForDb = globalThis as unknown as {
  _db: ReturnType<typeof drizzle> | undefined;
  _pool: Pool | undefined;
};

export function getDb() {
  ensureEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL DATABASE ERROR: DATABASE_URL environment variable is missing in production. In-memory store fallback is strictly forbidden in production."
      );
    }
    return null;
  }

  if (!globalForDb._db || !globalForDb._pool) {
    const cleanUrl = connectionString.trim().replace(/^["']|["']$/g, "");
    const pool = new Pool({
      connectionString: cleanUrl,
      max: 10,
    });
    globalForDb._pool = pool;
    globalForDb._db = drizzle(pool, { schema });
  }

  return globalForDb._db;
}

export function getPool(): Pool | null {
  getDb();
  return globalForDb._pool ?? null;
}

export type DbClient = NonNullable<ReturnType<typeof getDb>>;
