# Security

## Must-haves from the brief
| Requirement | How |
|---|---|
| One buyer never sees another's styles/volumes | (1) buyer_id taken from session/token, never the request; (2) every service query scoped by buyer; (3) Postgres RLS as a backstop; (4) automated test: Buyer B requests Buyer C's order/photo/export by ID → 404 |
| No secrets in repo | `.env.local` git-ignored, `.env.example` has names only; secret-scan in CI (e.g. gitleaks); rotate any key that is ever committed |
| Validated inputs | Zod schemas on every route; numeric bounds; max string lengths; enum checks |
| Access control | Role middleware + object-level checks (supervisor ↔ assigned unit, buyer ↔ own orders) |
| No real personal data | Seed uses invented names/emails; photos are generic stock/synthetic |

## Authentication
- Passwords hashed (argon2id or bcrypt), minimum length enforced
- httpOnly, Secure, SameSite=Lax session cookies; session expiry; logout invalidates
- Login rate limiting and generic error messages (no user enumeration)
- Buyer links: 32+ byte random token, only the **hash** stored, expiry + revoke, read-only scope, `Referrer-Policy: no-referrer`

## Data protection
- HTTPS only (HSTS on hosting)
- Photo uploads: allow-list MIME (jpeg/png/webp), size cap, re-encode client-side, random storage keys, buyer-visible flag; strip EXIF GPS where feasible
- Append-only tables for updates and date history (no UPDATE/DELETE grants)
- Audit log for logins, date changes, category overrides, warning decisions, link creation

## AI-specific
- Note text is **untrusted data**: placed in the user turn with a delimiter, never concatenated into instructions
- Output must parse as JSON and match the enum; otherwise fallback
- Model output is never rendered as HTML (escape everything) and never triggers actions
- Only the note text is sent to the API — no buyer names, quantities or PO numbers
- API key server-side only; never in client bundle

## Web hardening
CSP, `X-Content-Type-Options`, `X-Frame-Options`/frame-ancestors, CSRF protection for cookie-auth mutations, parameterised queries via ORM, output escaping, dependency audit in CI.

## Tests to write
1. Buyer isolation (API + export)
2. Supervisor cannot write to another unit's stage
3. Duplicate `client_uuid` creates one row
4. Unconfirmed warning invisible to buyer
5. Invalid/oversized payloads rejected
6. Date change without reason rejected

## Known limits (be honest in the TDD)
No MFA, no formal penetration test, no malware scan on photos, Tamil speech API sends audio to the browser vendor's service (disclose; text input is the alternative).
