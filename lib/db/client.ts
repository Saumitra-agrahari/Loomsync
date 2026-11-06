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

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

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
  if (!_db) {
    _pool = new Pool({ connectionString });
    _db = drizzle(_pool, { schema });
  }
  return _db;
}

export type DbClient = NonNullable<ReturnType<typeof getDb>>;
