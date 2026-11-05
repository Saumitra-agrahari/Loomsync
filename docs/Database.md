# Database

PostgreSQL. Timestamps are `timestamptz` (store UTC, display IST). IDs are UUIDs.

## Tables
**users** `id, name, email UNIQUE, password_hash, role ENUM(merchandiser,supervisor,buyer), buyer_id NULL→buyers, unit_id NULL→units, locale ENUM(en,ta), active, created_at`

**buyers** `id, name, country`  — e.g. Company B (UK), Company C (Germany)

**buyer_links** `id, buyer_id, token_hash UNIQUE, expires_at, revoked_at, created_by` (token shown once, only hash stored)

**units** `id, name, type ENUM(own,subcontract), stages_supported[]`

**orders** `id, po_no, buyer_id, style, status ENUM(open,shipped,cancelled), ex_factory_date, original_ex_factory_date, template_id, created_by, created_at` · `UNIQUE(buyer_id, po_no)`

**order_lines** `id, order_id, colour, size, qty CHECK(qty>0)`

**tna_templates** `id, name` · **tna_template_items** `id, template_id, stage, seq, offset_days_before_exfactory, planned_duration_days`

**order_stages** `id, order_id, stage, seq, unit_id, target_qty, planned_start, planned_end, current_end, actual_end`

**milestone_date_history** *(append-only)* `id, order_id, order_stage_id NULL, field, old_date, new_date, reason NOT NULL, changed_by, changed_at`

**daily_updates** *(append-only)* `id, client_uuid UNIQUE, order_stage_id, unit_id, reported_date, qty CHECK(qty>=0), note_original, note_lang, note_en, reason_category, ai_confidence, category_source ENUM(ai,fallback,human), category_changed_by, photo_id NULL, submitted_by, client_ts, received_at, is_correction`

**photos** `id, order_id, storage_key, uploaded_by, taken_at, visible_to_buyer bool default true`

**warnings** `id, order_id, order_stage_id, status ENUM(draft,confirmed,dismissed), required_rate, actual_rate, remaining, days_available, slip_days, math_snapshot JSONB, created_at, decided_by, decided_at, dismiss_reason`

**notifications** *(mock)* `id, buyer_id, warning_id, channel, payload, created_at`

**audit_log** `id, actor_id, action, entity, entity_id, meta JSONB, at`

## Relationships
```
buyers 1─* orders 1─* order_lines
orders 1─* order_stages 1─* daily_updates
orders 1─* warnings        orders 1─* milestone_date_history
tna_templates 1─* tna_template_items      units 1─* order_stages
```

## Indexes
`orders(buyer_id, ex_factory_date)` · `daily_updates(order_stage_id, reported_date)` · `warnings(order_id, status)` · `orders(status)`

## Integrity & security
- `daily_updates` and `milestone_date_history`: no UPDATE/DELETE grants for the app role (category override writes to `audit_log` + a new field, never edits the qty)
- **Row-level security** on orders, order_*, photos, warnings, history: policy `buyer_id = current_setting('app.buyer_id')` for buyer sessions
- Foreign keys `ON DELETE RESTRICT`

## Seed data (rates and extra orders are assumed, A7)
| PO | Buyer | Style | Qty | Ex-factory | Stage | Done | Seeded rate | Expected |
|---|---|---|---|---|---|---|---|---|
| B-PO-88213 | Company B (UK) | Men's crew neck tee, navy | 12,000 | 2026-11-20 | Stitching | 6,800 | ~480/day vs ~520 needed | Amber |
| B-PO-88240 | Company B (UK) | Men's polo, white | 8,000 | 2026-11-12 | Finishing | 5,200 | ~400/day vs ~560 needed | Red |
| C-PO-0488 | Company C (Germany) | Kids printed tee, yellow | 10,000 | 2026-11-28 | Printing | 3,100 | ~600/day vs ~575 needed | Green |

Add ~8–10 more invented orders across both buyers, 3 units + 1 print and 1 wash subcontractor, 14 days of update history each, a few Tamil notes, and 2–3 date changes with reasons. Seed dates relative to "today" so the demo never goes stale. Use clearly fake names/emails.

Sample Tamil notes (have a Tamil speaker verify wording):
- "தையல் இயந்திரம் பழுதாகிவிட்டது" → Machine breakdown
- "துணி இன்னும் வரவில்லை" → Material shortage
- "இன்று ஆட்கள் குறைவு" → Manpower shortage
- "மின்சாரம் இல்லை" → Power cut
