# Features

Priority: **P0** = core slice, **P1** = optional depth, **P2** = documented only.

## F1 Order setup (P0) — merchandiser
- Fields: PO no., buyer, style, colour(s), size-wise quantities (grid), ex-factory date, unit(s)
- Choose a TNA template → milestones auto-dated backwards from ex-factory using template offsets
- Validation: quantities > 0 integers, ex-factory in the future, PO unique per buyer
- Edge cases: changing ex-factory re-dates milestones **and** requires a reason (logged); duplicate PO blocked

## F2 TNA milestones (P0)
- Template = ordered list of `{stage, offset_days_before_exfactory, planned_duration_days}`
- Per order: planned date, current (revised) date, actual date, status
- Every date edit is appended to `milestone_date_history` (never updated or deleted)

## F3 Supervisor daily update (P0) — mobile, Tamil
- Screen 1: list of my orders (big cards, stage + today's status "sent / pending / queued")
- Screen 2: stage (pre-filled), **qty made today** (numeric keypad), photo, optional note (type or mic), **Send**
- Nothing else on screen
- Offline: saved to IndexedDB, shows "Queued", auto-sends when online; duplicates impossible (client UUID)
- Edge cases: qty > remaining → warn but allow with confirm; second update same day → adds a correction row, not a silent overwrite; photo compressed client-side (~≤300 KB)

## F4 AI reason category from Tamil notes (P0)
- Note (Tamil / English / Tanglish) → `{english_translation, category, confidence}`
- Categories: Machine breakdown · Material shortage · Manpower shortage · Power cut · Quality/rework · Buyer approval pending · Subcontractor delay · Other · Unclear
- Original text always shown beside translation; merchandiser can change category (marked `human`)
- Low confidence (< 0.6) or API failure → category `Unclear`, flagged "needs review"; the update itself is never blocked

## F5 Order board (P0) — merchandiser
- Table/cards sorted worst-first; colour chip + a text label (not colour alone)
- Filters: buyer, unit, ship week; filters live in the URL
- Each row: PO, style, buyer, stage, % done, required vs actual per day, ex-factory, status
- Grey "No recent data" if no update in 2 working days

## F6 Delay warning (P0)
- Run-rate engine (see Architecture.md §4) shows: `Need 520/day · Making 480/day · Short by 40/day`
- Creates a **draft** warning at ≥14 days out when ratio < 1.0
- Merchandiser reviews → **Confirm** (visible to buyer) or **Dismiss** (with reason)

## F7 Buyer view (P0) — read-only
- Private link/login scoped to one buyer
- Shows own orders only: milestone timeline, latest photos, % complete, confirmed warnings, date-change history
- Never shows: other buyers, internal notes, unconfirmed warnings, unit names (A: hidden by default)

## F8 Weekly export per buyer (P1)
- Excel (.xlsx) first, PDF second; one file per buyer; same scoping rules as buyer view

## F9 Date-change history (P1 for UI, P0 for storage)
- Timeline: date, who, old → new, reason; exportable for buyers' compliance teams

## F10 Tamil interface (P0)
- English/Tamil toggle, saved per user; all supervisor strings translated; numbers stay Western digits
- Tamil strings must be reviewed by a Tamil speaker before submission

## F11 Mocked integrations
- "Notify buyer" button writes to a `notifications` table and shows a toast; no real email/WhatsApp is sent
