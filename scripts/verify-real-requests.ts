import { spawn } from "child_process";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";

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

const PORT = 3055;
const BASE_URL = `http://localhost:${PORT}`;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(retries = 30): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/login`);
      if (res.ok || res.status === 200 || res.status === 304) {
        return true;
      }
    } catch {
      // not ready yet
    }
    await sleep(1000);
  }
  return false;
}

async function run() {
  console.log("=== Starting Next.js Production Server on port", PORT, "===");
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    shell: true,
    stdio: "inherit",
    env: { ...process.env, PORT: String(PORT) },
  });

  try {
    const ready = await waitForServer();
    if (!ready) {
      throw new Error("Server failed to become ready in 30 seconds");
    }
    console.log("✅ Next.js server is up and listening on", BASE_URL);

    // -------------------------------------------------------------
    // Test 1: Log in as merch@demo.example
    // -------------------------------------------------------------
    console.log("\n--- Test 1: Log in as merch@demo.example ---");
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "merch@demo.example",
        password: "Demo@12345",
      }),
    });

    if (!loginRes.ok) {
      const text = await loginRes.text();
      throw new Error(`Login failed with status ${loginRes.status}: ${text}`);
    }

    const setCookie = loginRes.headers.get("set-cookie") || "";
    const sessionCookie = setCookie.split(";")[0];
    const loginData = await loginRes.json();
    console.log(`✅ Login successful: User=${loginData.user.name}, Role=${loginData.user.role}`);
    console.log(`Session cookie received: ${sessionCookie.split("=")[0]}=***redacted***`);

    // -------------------------------------------------------------
    // Test 2: GET /api/orders returns seeded orders with red/amber/green
    // -------------------------------------------------------------
    console.log("\n--- Test 2: GET /api/orders as Merchandiser ---");
    const ordersRes = await fetch(`${BASE_URL}/api/orders`, {
      headers: { Cookie: sessionCookie },
    });

    if (!ordersRes.ok) {
      const text = await ordersRes.text();
      throw new Error(`GET /api/orders failed with status ${ordersRes.status}: ${text}`);
    }

    const ordersData = await ordersRes.json();
    console.log(`✅ GET /api/orders returned ${ordersData.orders.length} orders.`);
    console.log(`Board Status Summary:`, JSON.stringify(ordersData.summary));

    const { summary, orders } = ordersData;

    // Verify summary requirements: exactly 1 RED, at least 1 AMBER, at least 1 GREEN
    if (summary.red !== 1) {
      throw new Error(`Expected exactly 1 RED order on board, but found ${summary.red}`);
    }
    if (summary.amber < 1) {
      throw new Error(`Expected at least 1 AMBER order on board, but found ${summary.amber}`);
    }
    if (summary.green < 1) {
      throw new Error(`Expected at least 1 GREEN order on board, but found ${summary.green}`);
    }
    console.log("✅ Board summary assertion PASSED: exactly 1 RED, at least 1 AMBER, at least 1 GREEN.");

    // Print all orders with PO, Buyer, Stage, Done / Target, Status
    console.log("\n--- Full Order Board Status ---");
    for (const o of orders) {
      console.log(
        `  - PO: ${o.poNo.padEnd(12)} | Buyer: ${o.buyerName.padEnd(10)} | Stage: ${o.currentStage.padEnd(10)} | Done: ${String(o.stageDone).padStart(5)} / ${String(o.stageTargetQty).padEnd(5)} | Status: ${o.runRate.status.toUpperCase().padEnd(6)} (${o.runRate.statusReason})`
      );
    }

    // Explicitly verify the 3 core sample orders
    console.log("\n--- Verifying Core Sample Orders ---");
    const sample88213 = orders.find((o: any) => o.poNo === "B-PO-88213");
    const sample88240 = orders.find((o: any) => o.poNo === "B-PO-88240");
    const sample0488 = orders.find((o: any) => o.poNo === "C-PO-0488");

    if (!sample88213 || !sample88240 || !sample0488) {
      throw new Error("Missing one or more of the 3 required sample orders!");
    }

    console.log(`  Sample 1: B-PO-88213 -> Stage: ${sample88213.currentStage}, Done: ${sample88213.stageDone}/${sample88213.totalQty}, Status: ${sample88213.runRate.status.toUpperCase()}`);
    console.log(`  Sample 2: B-PO-88240 -> Stage: ${sample88240.currentStage}, Done: ${sample88240.stageDone}/${sample88240.totalQty}, Status: ${sample88240.runRate.status.toUpperCase()}`);
    console.log(`  Sample 3: C-PO-0488  -> Stage: ${sample0488.currentStage}, Done: ${sample0488.stageDone}/${sample0488.totalQty}, Status: ${sample0488.runRate.status.toUpperCase()}`);

    if (sample88213.runRate.status !== "amber" || sample88213.currentStage !== "Stitching" || sample88213.stageDone !== 6800) {
      throw new Error(`Sample B-PO-88213 mismatch: expected Stitching, 6800 done, AMBER; got ${sample88213.currentStage}, ${sample88213.stageDone}, ${sample88213.runRate.status}`);
    }
    if (sample88240.runRate.status !== "red" || sample88240.currentStage !== "Finishing" || sample88240.stageDone !== 5200) {
      throw new Error(`Sample B-PO-88240 mismatch: expected Finishing, 5200 done, RED; got ${sample88240.currentStage}, ${sample88240.stageDone}, ${sample88240.runRate.status}`);
    }
    if (sample0488.runRate.status !== "green" || sample0488.currentStage !== "Printing" || sample0488.stageDone !== 3100) {
      throw new Error(`Sample C-PO-0488 mismatch: expected Printing, 3100 done, GREEN; got ${sample0488.currentStage}, ${sample0488.stageDone}, ${sample0488.runRate.status}`);
    }
    console.log("✅ All 3 core sample orders matched their required stage, quantity, and distinct colours!");

    // -------------------------------------------------------------
    // Test 3: POST one daily update as sup1@demo.example & confirm in Neon DB
    // -------------------------------------------------------------
    console.log("\n--- Test 3: POST daily update as sup1@demo.example ---");
    const supLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "sup1@demo.example",
        password: "Demo@12345",
      }),
    });

    if (!supLoginRes.ok) {
      throw new Error(`Supervisor login failed: ${supLoginRes.status}`);
    }

    const supSetCookie = supLoginRes.headers.get("set-cookie") || "";
    const supCookie = supSetCookie.split(";")[0];
    const supData = await supLoginRes.json();
    console.log(`✅ Supervisor logged in: ${supData.user.name}, Unit=${supData.user.unitId}`);

    // Get supervisor's orders to pick a valid stage
    const supOrdersRes = await fetch(`${BASE_URL}/api/supervisor/orders`, {
      headers: { Cookie: supCookie },
    });
    const supOrdersData = await supOrdersRes.json();
    if (!supOrdersData.orders || supOrdersData.orders.length === 0) {
      throw new Error("No supervisor orders found for unit");
    }

    const targetStage = supOrdersData.orders[0];
    console.log(`Targeting stage: ${targetStage.stage} for PO ${targetStage.poNo} (Stage ID: ${targetStage.orderStageId})`);

    const clientUuid = `verify-neon-sync-${Date.now()}`;
    const postUpdateRes = await fetch(`${BASE_URL}/api/updates/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: supCookie,
      },
      body: JSON.stringify({
        updates: [
          {
            client_uuid: clientUuid,
            order_stage_id: targetStage.orderStageId,
            reported_date: "2026-11-06",
            qty: 125,
            note: "Cutting completed on schedule, fabric lot A verified",
            client_ts: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!postUpdateRes.ok) {
      const errText = await postUpdateRes.text();
      throw new Error(`POST /api/updates/batch failed (${postUpdateRes.status}): ${errText}`);
    }

    const updateResult = await postUpdateRes.json();
    console.log(`✅ API response:`, JSON.stringify(updateResult));

    // Now query Neon Postgres directly via Drizzle Pool to confirm it is written in DB
    console.log("Verifying record in Neon Postgres database directly...");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });

    const dbRow = await db
      .select()
      .from(schema.dailyUpdates)
      .where(eq(schema.dailyUpdates.clientUuid, clientUuid));

    if (dbRow.length === 0) {
      throw new Error(`Verification failed: record ${clientUuid} was not found in Neon daily_updates table!`);
    }

    console.log(`✅ Neon Postgres verification CONFIRMED! Row found in daily_updates:`);
    console.log(`   - ID: ${dbRow[0].id}`);
    console.log(`   - Client UUID: ${dbRow[0].clientUuid}`);
    console.log(`   - Stage ID: ${dbRow[0].orderStageId}`);
    console.log(`   - Reported Qty: ${dbRow[0].qty}`);
    console.log(`   - Reported Date: ${dbRow[0].reportedDate}`);

    // Check new total daily_updates count
    const allUpdates = await db.select().from(schema.dailyUpdates);
    console.log(`   - Total daily_updates count in Neon Postgres is now: ${allUpdates.length}`);

    // Clean up the inserted verification row so the seed database remains untouched
    console.log("Cleaning up test verification row from Neon database...");
    await db.delete(schema.dailyUpdates).where(eq(schema.dailyUpdates.clientUuid, clientUuid));
    const restoredUpdates = await db.select().from(schema.dailyUpdates);
    console.log(`✅ Test row removed. Total daily_updates count restored to: ${restoredUpdates.length}`);

    // -------------------------------------------------------------
    // Test 4: Confirm Buyer B cannot read a Buyer C order (404)
    // -------------------------------------------------------------
    console.log("\n--- Test 4: Verify Buyer B cannot read Buyer C order (404 isolation) ---");
    // Find Buyer C's order ID from DB
    const buyerCOrder = await db.query.orders.findFirst({
      where: eq(schema.orders.poNo, "C-PO-0488"),
    });

    if (!buyerCOrder) {
      throw new Error("Could not find Buyer C order C-PO-0488 in Neon DB");
    }
    console.log(`Found Buyer C order: ID=${buyerCOrder.id}, PO=${buyerCOrder.poNo}`);

    // Log in as buyerb@demo.example (Buyer B)
    const buyerBLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "buyerb@demo.example",
        password: "Demo@12345",
      }),
    });

    if (!buyerBLoginRes.ok) {
      throw new Error(`Buyer B login failed: ${buyerBLoginRes.status}`);
    }

    const buyerBSetCookie = buyerBLoginRes.headers.get("set-cookie") || "";
    const buyerBCookie = buyerBSetCookie.split(";")[0];
    const buyerBData = await buyerBLoginRes.json();
    console.log(`✅ Buyer B logged in: ${buyerBData.user.name}, BuyerId=${buyerBData.user.buyerId}`);

    // Attempt to access Buyer C's order as Buyer B
    const crossBuyerRes = await fetch(`${BASE_URL}/api/buyer/orders/${buyerCOrder.id}`, {
      headers: { Cookie: buyerBCookie },
    });

    console.log(`Cross-buyer request HTTP status: ${crossBuyerRes.status} ${crossBuyerRes.statusText}`);
    const crossBuyerBody = await crossBuyerRes.json();
    console.log(`Response body:`, JSON.stringify(crossBuyerBody));

    if (crossBuyerRes.status !== 404) {
      throw new Error(`Security failure! Expected 404 Not Found for cross-buyer access, got ${crossBuyerRes.status}`);
    }
    console.log("✅ Strict isolation verified: Buyer B received 404 Not Found when attempting to access Buyer C order!");

    await pool.end();
    console.log("\n🎉 ALL STEP 5 VERIFICATION CHECKS PASSED SUCCESSFULLY!");
  } finally {
    console.log("\nStopping server process...");
    server.kill();
  }
}

run().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
