import postgres from "postgres";
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

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const [b] = await sql`SELECT count(*)::int as count FROM buyers`;
  const [u] = await sql`SELECT count(*)::int as count FROM units`;
  const [o] = await sql`SELECT count(*)::int as count FROM orders`;
  const [os] = await sql`SELECT count(*)::int as count FROM order_stages`;
  const [du] = await sql`SELECT count(*)::int as count FROM daily_updates`;
  const [mdh] = await sql`SELECT count(*)::int as count FROM milestone_date_history`;
  const [w] = await sql`SELECT count(*)::int as count FROM warnings`;

  console.log("=== Neon Postgres Row Counts ===");
  console.log(`buyers: ${b.count}`);
  console.log(`units: ${u.count}`);
  console.log(`orders: ${o.count}`);
  console.log(`order_stages: ${os.count}`);
  console.log(`daily_updates: ${du.count}`);
  console.log(`milestone_date_history: ${mdh.count}`);
  console.log(`warnings: ${w.count}`);

  await sql.end();
}

main().catch((err) => {
  console.error("Count check failed:", err.message);
  process.exit(1);
});
