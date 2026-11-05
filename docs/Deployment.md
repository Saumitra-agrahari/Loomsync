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
