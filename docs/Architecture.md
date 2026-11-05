# Architecture

## 1. Overview
```
 Supervisor phone (PWA)            Merchandiser laptop           Buyer browser
 ┌───────────────────┐             ┌───────────────┐           ┌──────────────┐
 │ UI  │ IndexedDB   │             │ Board / Setup │           │ Read-only    │
 │     │ outbox queue│             │ Warnings      │           │ buyer view   │
 └──────────┬────────┘             └──────┬────────┘           └──────┬───────┘
            │ POST /api/updates/batch     │                           │
            ▼                             ▼                           ▼
        ┌─────────────────────  Next.js server (route handlers) ─────────────────┐
        │ AuthN → RBAC → Zod validation → services                               │
        │  • updates.service   • runrate.engine (pure fn)  • ai.classifier       │
        │  • warnings.service  • export.service            • audit/history       │
        └───────────────┬───────────────────────────┬────────────────────────────┘
                        ▼                           ▼
                  PostgreSQL (RLS)            Object storage (photos)      Claude API
```

## 2. Key decisions
| Decision | Reason |
|---|---|
| Monolith (Next.js) | One deploy, solo build |
| Run-rate engine is a **pure function** in `/lib/runrate` | Unit-testable, shows its maths to UI |
| Append-only tables for updates and date history | Compliance trail; corrections are new rows |
| Outbox pattern on the phone | Offline-first; sync is idempotent |
| AI output is *advisory*, stored beside the original | Wrong AI never destroys data |
| Buyer scoping at three layers (query, service, RLS) | "One buyer must never see another's data" |

## 3. Offline sync
1. Supervisor taps Send → record `{client_uuid, order_id, stage, qty, note, photo_blob, client_ts}` saved in IndexedDB, status `queued`.
2. Service worker / online event → `POST /api/updates/batch` (array, small chunks; photos uploaded separately via signed URL, retried independently).
3. Server inserts with `UNIQUE(client_uuid)` → `ON CONFLICT DO NOTHING`; returns per-item result.
4. Client marks `sent` only on server ack; failed items keep retrying with backoff.
5. Server uses `client_ts` as the *reported date*, `received_at` for audit (late sync still counts for the correct day).

## 4. Run-rate delay engine
Inputs: order, current stage, updates, TNA template, working-day calendar, `today`.

```
remaining        = stage_target_qty − Σ qty_done(stage)
downstream_days  = Σ planned_duration of stages after current (from TNA)
days_available   = working_days(today, ex_factory) − downstream_days
required_rate    = remaining / max(days_available, ε)
actual_rate      = mean(qty of last 3 reported working days)   // fallback: 7 days
ratio            = actual_rate / required_rate
projected_finish = today + ceil(remaining / actual_rate) working days + downstream_days
slip_days        = projected_finish − ex_factory
```
| Status | Rule |
|---|---|
| Green | ratio ≥ 1.00 |
| Amber | 0.80 ≤ ratio < 1.00 |
| Red | ratio < 0.80, or days_available ≤ 0 with remaining > 0 |
| Grey | < 2 updates or none in last 2 working days |

Edge cases: remaining = 0 → stage complete, move to next; actual_rate = 0 → red with "no output reported"; Sundays/holidays excluded; one-day spikes dampened by the 3-day mean.

**Worked example (seed; rates are assumed, A7):** B-PO-88240 polo, Finishing 5,200/8,000, ex-factory 12 Nov, today 5 Nov. Remaining 2,800; 1 downstream day (Packing); ~5 usable working days → required 560/day; actual 400/day → ratio 0.71 → **Red**, projected slip ≈ 2 days.

Early warning: the engine runs for every open order daily; a draft warning is created when ratio < 1.0 and ex-factory is ≥ 14 days away (or any time thereafter).

## 5. AI classification flow
```
note_original ──► detect lang ──► Claude (JSON-only prompt, temp 0)
                                      │ valid JSON + enum category?
                          yes ◄───────┴──────► no / timeout / error
                           │                        │
                store translation, category,   rule-based keyword match,
                confidence (source=ai)         else category=Unclear (source=fallback)
                           └────────► UI shows original + translation + category chip
                                      merchandiser can change (source=human, audit row)
```
Server validates the response against a Zod enum; free text from the model is never executed or trusted. Timeout ~8 s; update saves first, classification runs async.

## 6. Warning lifecycle
`draft` → (merchandiser) `confirmed` → visible to buyer · or → `dismissed` (reason required).  
A warning stores a **snapshot of the maths** at creation so the history is reproducible.

## 7. Folder structure
```
/app            routes (board, orders, s/ supervisor, b/ buyer, api/)
/components     ui primitives, StatusChip, RunRateCard
/lib            runrate/, ai/, auth/, db/, offline/, i18n/
/db             schema.ts, migrations/, seed.ts
/messages       en.json, ta.json
/tests          unit/, e2e/
/docs           these markdown files
```
