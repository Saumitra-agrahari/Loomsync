# API

REST over JSON, under `/api`. All inputs validated with Zod. Errors: `{ "error": { "code": "VALIDATION|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|CONFLICT|RATE_LIMITED", "message": "...", "fields": {...} } }`.  
Auth: session cookie (staff) or buyer link token (buyer, read-only). Role column: **M** merchandiser, **S** supervisor, **B** buyer.

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | any | Email + password → session |
| POST | `/api/auth/logout` | any | End session |
| GET | `/api/me` | any | Current user, role, locale |
| GET | `/api/templates` | M | TNA templates |
| POST | `/api/orders` | M | Create order + lines + stages from template |
| GET | `/api/orders?buyer=&unit=&week=&status=` | M | Board data incl. computed status |
| GET | `/api/orders/:id` | M, S(assigned), B(own) | Detail (fields filtered by role) |
| PATCH | `/api/orders/:id/dates` | M | Change ex-factory or milestone date; `reason` required; writes history |
| GET | `/api/orders/:id/history` | M, B(own) | Date-change history |
| GET | `/api/supervisor/orders` | S | Orders assigned to my unit |
| POST | `/api/photos/sign` | S | Signed upload URL (type + size checked) |
| POST | `/api/updates/batch` | S | Idempotent batch of daily updates |
| PATCH | `/api/updates/:id/category` | M | Override AI reason category |
| GET | `/api/orders/:id/runrate` | M | Engine output with all inputs (for "show the maths") |
| GET | `/api/warnings?status=draft` | M | Warning inbox |
| POST | `/api/warnings/:id/confirm` | M | Confirm → visible to buyer, mock notification |
| POST | `/api/warnings/:id/dismiss` | M | Dismiss with reason |
| POST | `/api/buyers/:id/links` | M | Create buyer link (token returned once) |
| DELETE | `/api/buyers/:id/links/:linkId` | M | Revoke |
| GET | `/api/buyer/orders` | B | Own orders only |
| GET | `/api/buyer/orders/:id` | B | Milestones, photos, confirmed warnings, history |
| GET | `/api/exports/weekly?buyer=&week=&format=xlsx\|pdf` | M, B(own) | Weekly status export |

## Examples
**POST /api/updates/batch** (supervisor)
```json
{ "updates": [{
  "client_uuid": "0b8c…", "order_stage_id": "…", "reported_date": "2026-11-05",
  "qty": 480, "note": "தையல் இயந்திரம் பழுதாகிவிட்டது", "photo_key": "uploads/…jpg",
  "client_ts": "2026-11-05T11:42:10+05:30"
}]}
```
Response `200`:
```json
{ "results": [{ "client_uuid": "0b8c…", "status": "created|duplicate|rejected", "error": null }] }
```
Classification happens after save; the update response never waits on the AI.

**GET /api/orders/:id/runrate**
```json
{ "stage": "Stitching", "remaining": 5200, "days_available": 10, "required_rate": 520,
  "actual_rate": 480, "ratio": 0.92, "status": "amber",
  "projected_finish": "2026-11-21", "slip_days": 1,
  "window": ["2026-11-02","2026-11-03","2026-11-04"] }
```

## Rules
- Buyer routes derive `buyer_id` from the token/session, **never** from a request parameter
- Supervisors can only post to stages assigned to their unit
- Rate limit login and batch endpoints; max batch 50 items; max photo 2 MB (after compression)
- Idempotency via `client_uuid`; repeat sends return `duplicate`, not an error
- Pagination on lists (`limit`, `cursor`)
