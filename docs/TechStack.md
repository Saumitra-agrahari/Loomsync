# Tech Stack

Chosen for: one developer, 7 days, free-tier deployment, low-end phones, simple review by a client's team.

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | One repo for UI and API; server rendering keeps the phone bundle small |
| Styling | **Tailwind CSS** + a small token file | Restrained palette, fast consistency |
| Database | **PostgreSQL** (Neon or Supabase free tier) | Relational data, constraints, row-level security |
| ORM / migrations | **Drizzle** (or Prisma) | Typed schema, migration files in repo |
| Auth | **Auth.js** credentials (argon2/bcrypt) + signed httpOnly cookies | Simple roles; buyer links use hashed tokens |
| Validation | **Zod** on every API input | Security requirement |
| Offline | **PWA** (service worker) + **Dexie** (IndexedDB) queue | Works on patchy networks, no native app |
| i18n | **next-intl**, `en` + `ta` | Tamil interface |
| Voice | Browser **Web Speech API** (`ta-IN`) with text fallback | No server cost; Chrome Android supports it (verify on target phones) |
| AI | **Anthropic Claude API**, model name from env `AI_MODEL` | Tamil understanding; JSON-only output; rule-based fallback |
| Images | Client-side compression → object storage (Supabase Storage / Vercel Blob) | Saves data on mobile |
| Export | `exceljs` (xlsx); `@react-pdf/renderer` or server-side HTML→PDF | Weekly buyer report |
| Tests | **Vitest** (unit), **Playwright** (1–2 e2e: offline sync, buyer isolation) | Cover the risky logic |
| Hosting | **Vercel** (app) + Neon/Supabase (DB) | Free, live URL for reviewers |
| CI | GitHub Actions: lint, typecheck, unit tests | Visible in commit history |

## Not chosen (and why)
- **Native app / React Native:** longer build, store friction; PWA is enough for a daily form.
- **Microservices:** unjustified for this scale (≈ 35 office users, 900 workers).
- **Realtime websockets:** daily updates don't need it; plain fetch on load.
- **Local LLM / on-device Tamil:** not realistic on 2–3 GB phones.

## Performance budget (supervisor screens)
- Target first-load JS under ~150 KB gzip for `/s/*` routes (measure and report the real number)
- No heavy UI kit or chart library on supervisor pages; system fonts + one Tamil-capable font subset (e.g. Noto Sans Tamil)

## Versions
Pin exact versions in `package.json`; check current stable versions when you scaffold — don't rely on this doc for numbers.
