import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
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

async function runMigrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("No DATABASE_URL provided. Schema is ready in db/migrations/.");
    return;
  }

  console.log("Running migrations against PostgreSQL...");
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  try {
    await migrate(db, { migrationsFolder: path.join(__dirname, "migrations") });
    console.log("Migrations applied successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrate();
