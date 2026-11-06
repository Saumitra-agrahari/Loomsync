# Deployment

> Submit this file (as `deployment.md`) inside the ZIP with the TDD. Update the placeholders before submitting.

## Local run
**Prerequisites:** Node.js (current LTS, v18+ or v20+), PostgreSQL database (Neon or local PostgreSQL), Git.

```bash
git clone <GITHUB_URL> && cd <repo>
cp .env.example .env.local        # fill in values (see Environment variables below)
npm install
npm run db:migrate                # create tables and apply migrations
npm run db:seed                   # demo users + sample orders (dates relative to today)
npm run dev                       # start dev server at http://localhost:3000
npm test                          # run all 41 unit tests
npm run ai:check                  # verify AI classifier and honest keyword fallback
npm run build                     # verify production Next.js build
```

## Environment variables (names only)
Never commit secrets or connection strings. `.env.example` lists exactly these names with empty values and 1-line comments:

| Name | Purpose | Required in Prod | Default / Example |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon pooled/direct) | Yes | (empty) |
| `AUTH_SECRET` | Secret key for session cookie signing (min 32 chars) | Yes | (empty) |
| `APP_URL` | Public base URL for links and buyer portal | No | `http://localhost:3000` |
| `AI_PROVIDER` | AI classifier provider (`nvidia` or `anthropic`) | No | `nvidia` |
| `AI_ENABLED` | `true` to invoke provider; `false` to use fallback | No | `false` |
| `AI_MODEL` | Provider model identifier | No | `meta/llama-3.1-70b-instruct` |
| `NVIDIA_API_KEY` | API key for NVIDIA API Catalog | No (if AI_ENABLED=false) | (empty) |
| `NVIDIA_BASE_URL` | NVIDIA API base URL (OpenAI-compatible) | No | `https://integrate.api.nvidia.com/v1` |
| `ANTHROPIC_API_KEY` | API key for Anthropic Claude | No (if using nvidia) | (empty) |

## Vercel deployment
1. Push to a **public** GitHub repository.
2. In Vercel, import the repository (Next.js App Router preset is auto-detected).
3. Configure the Environment Variables in Vercel project settings using the names above:
   - `DATABASE_URL`: Connection string from Neon (production branch).
   - `AUTH_SECRET`: Random 32+ character string (e.g. `openssl rand -hex 32`).
   - `APP_URL`: Your assigned Vercel deployment URL (e.g. `https://isocode-app.vercel.app`).
   - `AI_PROVIDER`: `nvidia` (or `anthropic`).
   - `AI_ENABLED`: `false` (or `true` if live provider key is configured).
   - `NVIDIA_API_KEY`: Your NVIDIA API key (if `AI_ENABLED=true`).
4. Run migrations and seed against the production database from your local machine:
   ```bash
   DATABASE_URL="<NEON_PRODUCTION_URL>" npm run db:migrate
   DATABASE_URL="<NEON_PRODUCTION_URL>" npm run db:seed
   ```
5. Deploy on Vercel.
6. Verify deployment health at `https://<your-vercel-domain>/api/health` — it will return:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-11-07T...",
     "database": { "connected": true, "latency_ms": 42 }
   }
   ```
7. Verify live routes: order board, supervisor update submission, buyer portal view.

Live URL: `<ADD AFTER DEPLOY>`  ·  Repo: `<ADD>`

## Demo logins (seeded; reset by re-running seed)
All demo accounts use password `Demo@12345`:

| Role | Email / Access | Password | Access Details |
|---|---|---|---|
| Merchandiser | `merch@demo.example` | `Demo@12345` | Factory-wide visibility, warning confirmation, stage management |
| Supervisor (Unit 1) | `sup1@demo.example` | `Demo@12345` | Unit 1 daily reporting (Cutting, Stitching, Finishing) |
| Buyer — Company B | `buyerb@demo.example` | `Demo@12345` | Scoped to Buyer B orders; access to confirmed warnings & authorized photos |
| Buyer — Company C | `buyerc@demo.example` | `Demo@12345` | Scoped to Buyer C orders; cannot access Buyer B orders or photos |
| Buyer Token Link | Direct URL via `/b?token=...` | None | Single-use/direct token printed to console during local non-prod seed |

## Re-seed note (CRITICAL for evaluation)
> [!IMPORTANT]
> **Re-run `npm run db:seed` on the day of evaluation or submission.**
> 
> The run-rate engine calculates on-track status relative to `today` using the last 3 working days of updates and remaining working days until `ex_factory_date`. If more than 2 working days elapse without new updates, active orders automatically transition to **GREY** ("No recent updates").
> 
> Running `npm run db:seed` resets and reseeds 14 working days of update history ending on the current day, immediately restoring the calibrated demo board:
> - **2 RED** orders (including `B-PO-88240` and `C-PO-0515`)
> - **3 AMBER** orders (including `B-PO-88213` and `B-PO-88272`)
> - **5 GREEN** orders (including `C-PO-0488`)
> - **1 GREY** order (`B-PO-88255` deliberately seeded without recent updates)
> - **2 Draft Warnings** and **1 Confirmed Warning** visible to Buyer B

## Reviewer checklist
1. **Health check:** Open `/api/health` to confirm server status and Neon database connectivity.
2. **Order board:** Three sample orders show distinct colours matching the brief:
   - `B-PO-88213`: Stitching, 6,800 done → AMBER (~480/day vs ~520 needed)
   - `B-PO-88240`: Finishing, 5,200 done → RED (~400/day vs ~560 needed)
   - `C-PO-0488`: Printing, 3,100 done → GREEN (~600/day vs ~575 needed)
3. **Supervisor mobile update:** Log in as `sup1@demo.example`, switch language to தமிழ் (`ta`), enter quantity and Tamil note (or voice input), test offline outbox in browser DevTools Network offline mode, reconnect, verify auto-sync.
4. **AI classification & review:** As merchandiser, view supervisor note beside translation and category; override category if necessary; review draft warning for `B-PO-88240`.
5. **Buyer portal & photo isolation:**
   - Log in as `buyerb@demo.example`: see confirmed warning for `B-PO-88260` and authorized sample photos.
   - Attempt to access Buyer C order `/b/ord-c-0488` as Buyer B → blocked (404/Not Found).
   - Attempt to access Buyer C photo `/api/photos/photo-c-0488-sample` as Buyer B → blocked (404/Not Found).
6. **Date change audit:** Edit an ex-factory date → required reason is saved and displayed in the immutable milestone date history.

## Detailed known limitations
1. **Free Neon cold starts:** The Neon serverless Postgres free-tier compute automatically suspends after 5 minutes of zero traffic. The first incoming request after idle takes 1-3 seconds while the compute instance wakes up; subsequent requests respond in <50 ms.
2. **Transactional mock notifications:** Email and WhatsApp notifications are durably recorded in the `notifications` table and rendered as toast alerts in the UI; third-party gateway SDKs (Twilio WhatsApp, SendGrid) are omitted to prevent external delivery failures or credential dependencies during grading.
3. **Photo storage in PostgreSQL `bytea`:** Images are compressed client-side to ≤ 300 KB, validated on the server for size and magic byte signatures (JPEG/PNG/WebP), and stored directly in PostgreSQL (`photos.image_data` `bytea`) served via `/api/photos/[id]`. This guarantees ACID transactional atomicity with update submissions and avoids S3/blob bucket configuration dependencies.
4. **In-memory rate limiting on serverless:** Sliding-window rate limiters for `/api/auth/login` (5 req/min) and `/api/updates/batch` (60 req/min) run in Node.js process memory. In multi-region or autoscaling serverless setups without Redis, limits apply per serverless container instance.
5. **Browser Tamil voice recognition:** Voice dictation relies on the standard W3C Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition` with locale `ta-IN`), which is natively supported in Chromium-based browsers (Google Chrome, Microsoft Edge, Brave on Android/Desktop). Firefox and Safari do not support the Web Speech API and gracefully fall back to native keyboard text input.
6. **Test-tier AI provider keys:** Free/developer-tier NVIDIA API Catalog and Anthropic keys are subject to shared rate limits, cold-starts, or catalog model availability. When the provider returns 429, 5xx, or timeouts (8 s limit), the classifier instantly falls back to the deterministic Tiruppur keyword matcher (`category_source = "fallback"`) without throwing errors or blocking update persistence.

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
3. **External cloud object storage:** Standardized on validated PostgreSQL `bytea` persistence served through authorized API routes with zero external S3 bucket setup required.
4. **PWA background sync API:** Implemented with IndexedDB (Dexie) outbox and auto-sync on browser `online` events, which works universally across all Android mobile browsers without requiring experimental background sync permissions.

### What to do next (post-MVP roadmap)
1. **Barcode / QR scanner:** Add handheld camera QR scanning for bundle tickets on the stitching line.
2. **ERP sync connector:** Bi-directional webhook sync for FastReact and SAP Apparel.
3. **Automated WhatsApp notifications:** Integrate Twilio WhatsApp Business API for confirmed warnings and weekly buyer reports.
4. **Multi-tenant factory management:** Allow parent garment groups to manage multiple subsidiary factories under independent domains.
