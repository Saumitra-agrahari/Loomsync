# PRD — Order Tracker for Company A (Tiruppur)

## 1. Problem
Company A (knitwear exporter, ~900 workers, 3 own units + subcontracted printing/washing) tracks orders in Excel updated by phone calls. Merchandisers learn an order is late when it is too late to save it. The brief estimates the cost at **₹1.08 crore/year**:

| Item | Working (from brief) | ₹ |
|---|---|---|
| Air freight | 15 orders × ₹3.5 lakh | 52.5 lakh |
| Late-shipment discount | 25 orders × ₹1.05 lakh (5% of ₹21 lakh) | 26.25 lakh |
| Status chasing | 12 merchandisers × 2 h/day → 7,200 h × ₹400 | 28.8 lakh |
| **Total** | | **≈ ₹1.08 crore** |

## 2. Goals and success metrics (from the brief)
- Late shipments 8% → 5% over two seasons
- Status-chasing time halved
- Buyer status emails down 60%
- **Hackathon goal:** one slice working end to end on realistic seed data (see §5).

## 3. Users
| Role | Device | Needs |
|---|---|---|
| Merchandiser | Laptop (also phone) | Set up orders, see every order's colour at a glance, review/confirm warnings, change AI categories |
| Unit supervisor | Cheap Android, 2–3 GB RAM, patchy network | Enter daily numbers + photo + note (text/voice, Tamil) in under a minute, even offline |
| Buyer (sourcing staff) | Any | Read-only: own orders' milestones, photos, confirmed warnings, date-change history |
| Managing Director | — | Signs the deal; sees the board (merchandiser view is enough) |

## 4. Scope
### Core build (must work end to end)
1. Order setup: PO, buyer, style, colour × size quantities, ex-factory date, TNA milestones from a template
2. Supervisor daily update: quantity per stage, photo, issue note (text or voice, Tamil OK), offline queue
3. Order board: green/amber/red, filter by buyer, unit, ship week
4. Delay warning: run-rate projection that shows its maths
5. AI: Tamil note → English reason category, original shown beside it, merchandiser can override
6. Read-only buyer link with strict isolation
7. Roles: merchandiser, supervisor (+ buyer read-only)
8. Tamil/English UI toggle

### Optional depth (if time allows, in this order)
Weekly per-buyer export (Excel, then PDF) → date-change history view → warning inbox badge → PWA install prompt.

### Out of scope (stated in brief)
Costing, invoicing, export documents, fabric inventory, attendance/payroll. Payments, messaging and external systems are **mocked**.

## 5. Acceptance criteria
- [ ] Merchandiser creates an order from a template; milestones get dates back-calculated from ex-factory
- [ ] Supervisor submits an update in airplane mode; it syncs once online with no duplicates
- [ ] Board colours match the maths shown on the order detail page
- [ ] A warning appears ≥14 days before ex-factory when the run rate is insufficient
- [ ] Buyer never receives a warning until a merchandiser confirms it
- [ ] Buyer B cannot read Buyer C's data by URL tampering or API calls (tested)
- [ ] Every ex-factory/milestone date change is stored with who, when, old, new, reason
- [ ] No dead buttons; loading, empty, error states on every screen; usable at 360 px width

## 6. Assumptions (labelled — not given in the brief)
- **A1** Stages per order come from a template, e.g. Tee: Cutting → Printing → Stitching → Finishing → Packing.
- **A2** 6-day working week (Sunday off); holidays configurable.
- **A3** An order's "current stage" is the earliest stage with remaining quantity; supervisors report per stage.
- **A4** Each order is assigned to one unit per stage (subcontractors are modelled as units).
- **A5** Buyers get access via a revocable private link and/or a buyer-role login.
- **A6** Thresholds (green ≥ 1.00, amber 0.80–0.99, red < 0.80) are defaults, editable by merchandiser later.
- **A7** Seed output rates are invented to produce a green/amber/red mix; they are not client data.
- **A8** Tamil voice input uses the browser speech API where supported; text is the fallback.
- **A9** Image uploads are compressed client-side to ≤ 300 KB before transmission; object storage keys are structured by PO and timestamp.
- **A10** Fallback keyword classification uses verified Tiruppur garment terminology (பழுது, துணி, ஆட்கள், மின்சாரம்) and honestly marks category_source as fallback with confidence ~0.70–0.75.

## 7. Build plan (7 days, solo)
| Day | Output |
|---|---|
| 1 | Repo, DB schema, seed, auth, roles, i18n skeleton |
| 2 | Order setup + TNA templates |
| 3 | Supervisor update UI + offline queue + idempotent sync |
| 4 | Run-rate engine + unit tests + order board |
| 5 | AI classifier + warning review + buyer link and isolation tests |
| 6 | Polish: states, mobile, Tamil strings, date-change history, export |
| 7 | Deploy, TDD (PDF), deployment.md, commit-history tidy, demo rehearsal |
