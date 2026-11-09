import { NextResponse } from "next/server";
import { getDb, getPool } from "@/lib/db/client";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  let dbResponding = false;
  let connectionTimeMs: number | undefined;
  let queryTimeMs: number | undefined;

  try {
    const pool = getPool();
    if (pool) {
      // 1. Measure connection acquisition / setup time
      // (< 1 ms on an already-open/idle connection in the pool; ~1-2 s on cold start)
      const connectStart = performance.now();
      const client = await pool.connect();
      connectionTimeMs = Math.round(performance.now() - connectStart);

      try {
        // 2. Measure simple `SELECT 1` on the already-open connection
        const queryStart = performance.now();
        await client.query("SELECT 1 as health_check");
        queryTimeMs = Math.round(performance.now() - queryStart);
        dbResponding = true;
      } finally {
        // Release client back to the pool so the connection remains open and warm for subsequent requests
        client.release();
      }
    } else {
      // Non-production fallback to in-memory store
      const db = getDb();
      if (db) {
        const queryStart = performance.now();
        await db.execute(sql`SELECT 1 as health_check`);
        queryTimeMs = Math.round(performance.now() - queryStart);
        connectionTimeMs = 0;
        dbResponding = true;
      }
    }
  } catch {
    dbResponding = false;
  }

  return NextResponse.json(
    {
      status: "ok",
      database: {
        connected: dbResponding,
        connection_time_ms: dbResponding ? connectionTimeMs : undefined,
        query_time_ms: dbResponding ? queryTimeMs : undefined,
        latency_ms: dbResponding ? queryTimeMs : undefined,
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
