# UI / UX

**Principle (from the client):** minimal, white space, restrained palette, clear type, nothing on screen without a purpose. The board shows trouble at a glance; the supervisor screen is *numbers, a photo, a send button*.

## Design tokens
| Token | Value | Use |
|---|---|---|
| Background | `#FFFFFF` / surface `#F7F7F5` | Page / cards |
| Text | `#161616` primary, `#6B6B66` secondary | |
| Accent | one deep colour (e.g. indigo `#2B3A67`) | Primary buttons, links |
| Status | green `#2E7D32`, amber `#B7791F`, red `#C62828` | Status only — never decoration |
| Radius / spacing | 8 px / 4-pt grid | |
| Type | System UI + Noto Sans Tamil; sizes 14 / 16 / 20 / 28 | Min 16 px on mobile inputs |

Status is **colour + label + icon shape** (accessibility; colour-blind safe).

## Screens (8)
1. **Login** — email, password, language toggle
2. **Order board** (M) — worst-first list; chips for buyer / unit / ship week; each row: PO·style, stage progress bar, `need 520 · making 480`, ex-factory, status chip. Summary strip: `3 red · 5 amber · 12 green`
3. **Order setup** (M) — 3 steps: Basics (PO, buyer, style, date) → Quantities (colour × size grid) → Template & milestones (preview dates)
4. **Order detail** (M) — run-rate card (the maths), TNA timeline, update history with note + translation + category, date-change history
5. **Warning inbox** (M) — draft warnings: maths, original note beside translation, **Confirm / Dismiss**
6. **Supervisor home** (S) — big cards of my orders; state badge: Pending / Queued / Sent
7. **Supervisor update** (S) — stage (pre-filled), large numeric field, camera button, note + mic, big **Send / அனுப்பு**
8. **Buyer view** (B) — own orders, milestone timeline, photos, confirmed warnings, date history, download weekly report

## Supervisor UX rules
- One thumb, one screen, ≤ 3 taps to send; numeric keypad; sticky Send button
- Offline banner is calm, not alarming: "Saved on phone — will send when network returns"
- No spinners that block; optimistic "Queued" state
- Tamil labels first for supervisor role; icons paired with text
- Tap targets ≥ 48 px; high contrast for sunlight

## States (every screen)
| State | Behaviour |
|---|---|
| Loading | Skeleton rows, not spinners |
| Empty | Short sentence + one action ("No orders yet — create one") |
| Error | Plain language + Retry; never raw stack/JSON |
| Offline | Banner + queued count |
| Success | Brief toast; no modal |

## Responsive
Board becomes cards under 640 px; filters collapse into a bottom sheet; tables never scroll horizontally on buyer view.

## Microcopy (en / ta)
Keep strings in `messages/en.json` and `ta.json`. Tamil copy needs a native-speaker review (starter, verify: "அனுப்பு" = Send).

## Don'ts
No dashboards of vanity charts, no gradients, no more than one accent colour, no auto-playing anything, no modal chains.
