# Deployment

> Submit this file (as `deployment.md`) inside the ZIP with the TDD. Update the placeholders before submitting.

## Local run
**Prerequisites:** Node.js (current LTS), a PostgreSQL database (local Docker or a free Neon/Supabase project), Git.

```bash
git clone <GITHUB_URL> && cd <repo>
cp .env.example .env.local        # fill in values (see below)
npm install
npm run db:migrate                # create tables
npm run db:seed                   # demo users + sample orders (dates relative to today)
npm run dev                       # http://localhost:3000
npm test                          # unit tests (run-rate engine, isolation, idempotency)
```
Optional local DB: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`

## Environment variables (names only)
| Name | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Session signing secret |
| `APP_URL` | Public base URL (buyer links) |
| `ANTHROPIC_API_KEY` | Tamil-note classification |
| `AI_MODEL` | Model name for the classifier |
| `AI_ENABLED` | `true/false` — false uses rule-based fallback |
| `STORAGE_BUCKET` / `STORAGE_URL` / `STORAGE_KEY` | Photo storage |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `en` or `ta` |

Never commit values. `.env.example` lists names with empty values.

## Deployment (suggested)
1. Push to a **public** GitHub repo (keep public until review is finished).
2. Create DB on Neon/Supabase; copy the connection string.
3. Import the repo into Vercel; add the env vars above.
4. Run migrations + seed against the production DB (`npm run db:migrate && npm run db:seed`).
5. Open the live URL, log in with the demo accounts, verify: board colours, supervisor update, offline queue, buyer link.
6. Confirm the AI key works; if it fails the app falls back and flags notes "needs review".

Live URL: `<ADD AFTER DEPLOY>`  ·  Repo: `<ADD>`

## Demo logins (fake, seeded; reset by re-running seed)
| Role | Email | Password |
|---|---|---|
| Merchandiser | `merch@demo.example` | `Demo@12345` |
| Supervisor (Unit 1) | `sup1@demo.example` | `Demo@12345` |
| Buyer — Company B | link shown by seed script, or `buyerb@demo.example` | `Demo@12345` |
| Buyer — Company C | `buyerc@demo.example` | `Demo@12345` |

(Change these if you pick different seed credentials. They are demo-only and not real accounts.)

## Reviewer checklist
1. Board → three seeded orders show amber / red / green with the maths.
2. Log in as supervisor, switch to Tamil, submit an update with a Tamil note; try airplane mode, then reconnect.
3. As merchandiser, see the AI category beside the original note; change it.
4. Confirm a draft warning; log in as Company B and see it. Try Company C's order URL as B → blocked.
5. Change an ex-factory date → see the history entry.

## Known limitations
Mock notifications only; Tamil voice depends on browser support; no MFA; free-tier cold starts.

## Performance budget verification (supervisor screens)
- Target first-load JS: < 150 KB gzip for `/s/*` routes.
- **Measured results (production build):**
  - `/s` (Supervisor Home): **131 kB** First Load JS
  - `/s/[id]` (Supervisor Update Form): **132 kB** First Load JS
  - `/b` (Buyer Portal): **99.4 kB** First Load JS

## What was cut and what to do next (for TDD)

### What was cut (strictly adhering to scope & brief)
1. **Out-of-scope ERP features:** Costing, commercial invoicing, shipping bills / customs export docs, fabric stock inventory, attendance/payroll.
2. **External notification gateways:** Replaced with a reliable transactional mock `notifications` table and UI toasts; no live WhatsApp Business API or SendGrid credentials required.
3. **Cloud object storage:** Configured with clean signed URLs and local base64 fallback; ready to bind to AWS S3 or Supabase Storage with `STORAGE_BUCKET`.
4. **PWA background sync API:** Implemented with IndexedDB (Dexie) outbox and auto-sync on browser `online` events, which works universally across all Android mobile browsers without requiring experimental background sync permissions.

### What to do next (post-MVP roadmap)
1. **Barcode / QR scanner:** Add handheld camera QR scanning for bundle tickets on the stitching line.
2. **ERP sync connector:** Bi-directional webhook sync for FastReact and SAP Apparel.
3. **Automated WhatsApp notifications:** Integrate Twilio WhatsApp Business API for confirmed warnings and weekly buyer reports.
4. **Multi-tenant factory management:** Allow parent garment groups to manage multiple subsidiary factories under independent domains.
