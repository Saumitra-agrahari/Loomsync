import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  let dbResponding = false;
  let latencyMs = 0;

  try {
    const db = getDb();
    if (db) {
      const start = Date.now();
      await db.execute(sql`SELECT 1 as health_check`);
      latencyMs = Date.now() - start;
      dbResponding = true;
    }
  } catch {
    dbResponding = false;
  }

  return NextResponse.json(
    {
      status: "ok",
      database: {
        connected: dbResponding,
        latency_ms: dbResponding ? latencyMs : undefined,
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
