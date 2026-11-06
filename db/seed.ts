import postgres from "postgres";
import { generateSeedData } from "../lib/db/seed-data";
import path from "path";
import fs from "fs";
import crypto from "crypto";

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

export function toUuid(str: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str.toLowerCase();
  }
  const h = crypto.createHash("md5").update(str).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

async function runSeed() {
  const connectionString = process.env.DATABASE_URL;
  const seed = generateSeedData();

  console.log("=== Seed Data Summary ===");
  console.log(`Buyers: ${seed.buyers.length}`);
  console.log(`Units: ${seed.units.length}`);
  console.log(`Users: ${seed.users.length}`);
  console.log(`Orders: ${seed.orders.length}`);
  console.log(`Order Stages: ${seed.orderStages.length}`);
  console.log(`Daily Updates: ${seed.dailyUpdates.length}`);
  console.log(`Milestone Date Changes: ${seed.milestoneDateHistory.length}`);
  console.log(`Draft Warnings: ${seed.warnings.length}`);
  console.log(`Buyer Access Links: ${seed.buyerLinks.length}`);
  console.log("Demo logins ready: merch@demo.example, sup1@demo.example, buyerb@demo.example, buyerc@demo.example");

  if (!connectionString) {
    console.log("No DATABASE_URL set; memory store initialized with full seed data.");
    return;
  }

  console.log("Seeding PostgreSQL database...");
  const sql = postgres(connectionString, { max: 1 });

  try {
    // Truncate application tables before seeding to guarantee a clean slate
    console.log("Truncating application tables (CASCADE)...");
    await sql`
      TRUNCATE TABLE 
        daily_updates,
        milestone_date_history,
        photos,
        warnings,
        notifications,
        audit_log,
        order_lines,
        order_stages,
        orders,
        buyer_links,
        tna_template_items,
        tna_templates,
        users,
        units,
        buyers
      CASCADE
    `;

    // Insert buyers
    for (const b of seed.buyers) {
      const id = toUuid(b.id);
      await sql`
        INSERT INTO buyers (id, name, country, created_at)
        VALUES (${id}, ${b.name}, ${b.country}, ${b.createdAt})
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, country = EXCLUDED.country
      `;
    }

    // Insert units
    for (const u of seed.units) {
      const id = toUuid(u.id);
      await sql`
        INSERT INTO units (id, name, type, stages_supported, created_at)
        VALUES (${id}, ${u.name}, ${u.type}, ${JSON.stringify(u.stagesSupported)}, ${u.createdAt})
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type
      `;
    }

    // Insert users
    for (const usr of seed.users) {
      const id = toUuid(usr.id);
      const buyerId = usr.buyerId ? toUuid(usr.buyerId) : null;
      const unitId = usr.unitId ? toUuid(usr.unitId) : null;
      await sql`
        INSERT INTO users (id, name, email, password_hash, role, buyer_id, unit_id, locale, active, created_at)
        VALUES (${id}, ${usr.name}, ${usr.email}, ${usr.passwordHash}, ${usr.role}, ${buyerId}, ${unitId}, ${usr.locale}, ${usr.active}, ${usr.createdAt})
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, buyer_id = EXCLUDED.buyer_id, unit_id = EXCLUDED.unit_id
      `;
    }

    // Insert templates
    for (const t of seed.tnaTemplates) {
      const id = toUuid(t.id);
      await sql`
        INSERT INTO tna_templates (id, name, created_at)
        VALUES (${id}, ${t.name}, ${t.createdAt})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    for (const ti of seed.tnaTemplateItems) {
      const id = toUuid(ti.id);
      const templateId = toUuid(ti.templateId);
      await sql`
        INSERT INTO tna_template_items (id, template_id, stage, seq, offset_days_before_exfactory, planned_duration_days)
        VALUES (${id}, ${templateId}, ${ti.stage}, ${ti.seq}, ${ti.offsetDaysBeforeExfactory}, ${ti.plannedDurationDays})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Insert orders
    for (const o of seed.orders) {
      const id = toUuid(o.id);
      const buyerId = toUuid(o.buyerId);
      const templateId = o.templateId ? toUuid(o.templateId) : null;
      const createdBy = toUuid(o.createdBy);
      await sql`
        INSERT INTO orders (id, po_no, buyer_id, style, status, ex_factory_date, original_ex_factory_date, template_id, created_by, created_at)
        VALUES (${id}, ${o.poNo}, ${buyerId}, ${o.style}, ${o.status}, ${o.exFactoryDate}, ${o.originalExFactoryDate}, ${templateId}, ${createdBy}, ${o.createdAt})
        ON CONFLICT (buyer_id, po_no) DO UPDATE SET status = EXCLUDED.status, ex_factory_date = EXCLUDED.ex_factory_date
      `;
    }

    // Insert order lines
    for (const l of seed.orderLines) {
      const id = toUuid(l.id);
      const orderId = toUuid(l.orderId);
      await sql`
        INSERT INTO order_lines (id, order_id, colour, size, qty)
        VALUES (${id}, ${orderId}, ${l.colour}, ${l.size}, ${l.qty})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Insert order stages
    for (const s of seed.orderStages) {
      const id = toUuid(s.id);
      const orderId = toUuid(s.orderId);
      const unitId = toUuid(s.unitId);
      await sql`
        INSERT INTO order_stages (id, order_id, stage, seq, unit_id, target_qty, planned_start, planned_end, current_end, actual_end)
        VALUES (${id}, ${orderId}, ${s.stage}, ${s.seq}, ${unitId}, ${s.targetQty}, ${s.plannedStart}, ${s.plannedEnd}, ${s.currentEnd}, ${s.actualEnd ?? null})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Insert milestone history
    for (const h of seed.milestoneDateHistory) {
      const id = toUuid(h.id);
      const orderId = toUuid(h.orderId);
      const orderStageId = h.orderStageId ? toUuid(h.orderStageId) : null;
      const changedBy = toUuid(h.changedBy);
      await sql`
        INSERT INTO milestone_date_history (id, order_id, order_stage_id, field, old_date, new_date, reason, changed_by, changed_at)
        VALUES (${id}, ${orderId}, ${orderStageId}, ${h.field}, ${h.oldDate}, ${h.newDate}, ${h.reason}, ${changedBy}, ${h.changedAt})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Insert photos
    for (const p of seed.photos) {
      const id = toUuid(p.id);
      const orderId = toUuid(p.orderId);
      const uploadedBy = toUuid(p.uploadedBy);
      await sql`
        INSERT INTO photos (id, order_id, storage_key, image_data, mime_type, size_bytes, uploaded_by, taken_at, visible_to_buyer)
        VALUES (${id}, ${orderId}, ${p.storageKey}, ${p.imageData ?? null}, ${p.mimeType ?? 'image/png'}, ${p.sizeBytes ?? null}, ${uploadedBy}, ${p.takenAt}, ${p.visibleToBuyer})
        ON CONFLICT (id) DO UPDATE SET image_data = EXCLUDED.image_data, mime_type = EXCLUDED.mime_type, size_bytes = EXCLUDED.size_bytes
      `;
    }

    // Insert daily updates
    for (const u of seed.dailyUpdates) {
      const id = toUuid(u.id);
      const orderStageId = toUuid(u.orderStageId);
      const unitId = toUuid(u.unitId);
      const submittedBy = toUuid(u.submittedBy);
      const photoId = u.photoId ? toUuid(u.photoId) : null;
      await sql`
        INSERT INTO daily_updates (id, client_uuid, order_stage_id, unit_id, reported_date, qty, note_original, note_lang, note_en, reason_category, ai_confidence, category_source, photo_id, submitted_by, client_ts, received_at, is_correction)
        VALUES (${id}, ${u.clientUuid}, ${orderStageId}, ${unitId}, ${u.reportedDate}, ${u.qty}, ${u.noteOriginal ?? null}, ${u.noteLang ?? null}, ${u.noteEn ?? null}, ${u.reasonCategory ?? null}, ${u.aiConfidence ?? null}, ${u.categorySource ?? null}, ${photoId}, ${submittedBy}, ${u.clientTs}, ${u.receivedAt}, ${u.isCorrection})
        ON CONFLICT (client_uuid) DO NOTHING
      `;
    }

    // Insert warnings
    for (const w of seed.warnings) {
      const id = toUuid(w.id);
      const orderId = toUuid(w.orderId);
      const orderStageId = toUuid(w.orderStageId);
      await sql`
        INSERT INTO warnings (id, order_id, order_stage_id, status, required_rate, actual_rate, remaining, days_available, slip_days, math_snapshot, created_at)
        VALUES (${id}, ${orderId}, ${orderStageId}, ${w.status}, ${w.requiredRate}, ${w.actualRate}, ${w.remaining}, ${w.daysAvailable}, ${w.slipDays}, ${JSON.stringify(w.mathSnapshot)}, ${w.createdAt})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Insert buyer links
    for (const bl of seed.buyerLinks) {
      const id = toUuid(bl.id);
      const buyerId = toUuid(bl.buyerId);
      const createdBy = toUuid(bl.createdBy);
      await sql`
        INSERT INTO buyer_links (id, buyer_id, token_hash, expires_at, created_by, created_at)
        VALUES (${id}, ${buyerId}, ${bl.tokenHash}, ${bl.expiresAt}, ${createdBy}, ${bl.createdAt})
        ON CONFLICT (token_hash) DO NOTHING
      `;
    }

    console.log("PostgreSQL seed complete!");
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n🔑 Local Demo Buyer B Link (token shown once): http://localhost:3000/b?token=${seed.generatedBuyerToken}\n`);
    }
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runSeed();
