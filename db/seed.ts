import postgres from "postgres";
import { generateSeedData } from "../lib/db/seed-data";

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
    // Insert buyers
    for (const b of seed.buyers) {
      await sql`
        INSERT INTO buyers (id, name, country, created_at)
        VALUES (${b.id}, ${b.name}, ${b.country}, ${b.createdAt})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Insert units
    for (const u of seed.units) {
      await sql`
        INSERT INTO units (id, name, type, stages_supported, created_at)
        VALUES (${u.id}, ${u.name}, ${u.type}, ${JSON.stringify(u.stagesSupported)}, ${u.createdAt})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Insert users
    for (const usr of seed.users) {
      await sql`
        INSERT INTO users (id, name, email, password_hash, role, buyer_id, unit_id, locale, active, created_at)
        VALUES (${usr.id}, ${usr.name}, ${usr.email}, ${usr.passwordHash}, ${usr.role}, ${usr.buyerId || null}, ${usr.unitId || null}, ${usr.locale}, ${usr.active}, ${usr.createdAt})
        ON CONFLICT (email) DO NOTHING
      `;
    }

    // Insert templates
    for (const t of seed.tnaTemplates) {
      await sql`
        INSERT INTO tna_templates (id, name, created_at)
        VALUES (${t.id}, ${t.name}, ${t.createdAt})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    for (const ti of seed.tnaTemplateItems) {
      await sql`
        INSERT INTO tna_template_items (id, template_id, stage, seq, offset_days_before_exfactory, planned_duration_days)
        VALUES (${ti.id}, ${ti.templateId}, ${ti.stage}, ${ti.seq}, ${ti.offsetDaysBeforeExfactory}, ${ti.plannedDurationDays})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Insert orders
    for (const o of seed.orders) {
      await sql`
        INSERT INTO orders (id, po_no, buyer_id, style, status, ex_factory_date, original_ex_factory_date, template_id, created_by, created_at)
        VALUES (${o.id}, ${o.poNo}, ${o.buyerId}, ${o.style}, ${o.status}, ${o.exFactoryDate}, ${o.originalExFactoryDate}, ${o.templateId}, ${o.createdBy}, ${o.createdAt})
        ON CONFLICT (buyer_id, po_no) DO NOTHING
      `;
    }

    // Insert order lines
    for (const l of seed.orderLines) {
      await sql`
        INSERT INTO order_lines (id, order_id, colour, size, qty)
        VALUES (${l.id}, ${l.orderId}, ${l.colour}, ${l.size}, ${l.qty})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Insert order stages
    for (const s of seed.orderStages) {
      await sql`
        INSERT INTO order_stages (id, order_id, stage, seq, unit_id, target_qty, planned_start, planned_end, current_end, actual_end)
        VALUES (${s.id}, ${s.orderId}, ${s.stage}, ${s.seq}, ${s.unitId}, ${s.targetQty}, ${s.plannedStart}, ${s.plannedEnd}, ${s.currentEnd}, ${s.actualEnd})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Insert milestone history
    for (const h of seed.milestoneDateHistory) {
      await sql`
        INSERT INTO milestone_date_history (id, order_id, order_stage_id, field, old_date, new_date, reason, changed_by, changed_at)
        VALUES (${h.id}, ${h.orderId}, ${h.orderStageId || null}, ${h.field}, ${h.oldDate}, ${h.newDate}, ${h.reason}, ${h.changedBy}, ${h.changedAt})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Insert daily updates
    for (const u of seed.dailyUpdates) {
      await sql`
        INSERT INTO daily_updates (id, client_uuid, order_stage_id, unit_id, reported_date, qty, note_original, note_lang, note_en, reason_category, ai_confidence, category_source, submitted_by, client_ts, received_at, is_correction)
        VALUES (${u.id}, ${u.clientUuid}, ${u.orderStageId}, ${u.unitId}, ${u.reportedDate}, ${u.qty}, ${u.noteOriginal}, ${u.noteLang}, ${u.noteEn}, ${u.reasonCategory}, ${u.aiConfidence}, ${u.categorySource}, ${u.submittedBy}, ${u.clientTs}, ${u.receivedAt}, ${u.isCorrection})
        ON CONFLICT (client_uuid) DO NOTHING
      `;
    }

    console.log("PostgreSQL seed complete!");
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runSeed();
