# Courtix

Book any court — pickleball, badminton, basketball and golf, by the hour, across
Davao del Norte and Davao del Sur.

Production frontend built from the pitch prototype. Next.js 15 (App Router),
TypeScript, Tailwind v4.

```bash
npm install
npm run dev      # http://localhost:3000
```

No configuration needed. The waitlist and bookings write to `data/*.json` on
disk, so everything works on a fresh clone.

---

## Pages

### Player-facing

| Route | What it is |
|---|---|
| `/` | Landing — hero with animated court diagram, sport cards, live directory, waitlist CTA |
| `/sports` | All four sports with stats |
| `/sports/[sport]` | Per-sport page — pickleball, badminton, basketball, golf |
| `/courts` | Directory with filters (sport, city, price, indoor) and sorting |
| `/courts/[slug]` | Court detail + booking panel (14 courts) |
| `/book/[slug]` | Checkout — player details, live quote |
| `/bookings/[ref]` | Confirmation with the `CTX-` gate reference |
| `/waitlist` | **The CTA form** — full page with FAQ |
| `/list-your-court` | Host acquisition, ends in the same form |
| `/how-it-works` | Player and owner walkthroughs |
| `/login` | Auth shell (not wired — see the integration plan) |
| `/app` | Mobile app preview |

### Owner dashboard — `/owner`

Dashboard · Bookings · My courts · Players · Payouts · Reports · Settings

### Super admin — `/admin`

Overview · Facilities · Users · Approvals · **Waitlist** · Commission · Disputes · Settings

`/admin/waitlist` and `/owner/bookings` read live stored data — submit the form
or complete a booking and it appears there immediately.

---

## The waitlist CTA

The form visitors fill in. Appears on `/`, `/waitlist`, and `/list-your-court`.

Collects name, email, city, optional mobile, role (player / owner / both),
sports of interest, and free-text notes. Returns a queue position.

- Validated with a zod schema **shared by the client and the API route**, so the
  inline error text is exactly what the server would produce
- Duplicate emails return the original queue position instead of creating a
  second entry
- Honeypot field — a filled `website` gets a fake success and stores nothing,
  so bots don't learn to retry
- Server re-validates everything regardless of what the client checked

```
POST /api/waitlist  → 201 { position, alreadyJoined }
                    → 400 { errors: { field: message } }
GET  /api/waitlist  → aggregate counts only, no personal data
```

---

## Booking flow

```
/courts/[slug]   pick date, duration, start time     BookingPanel
      ↓          only slots where the full duration fits are selectable
/book/[slug]     player details, live quote          CheckoutForm
      ↓          POST /api/bookings
/bookings/[ref]  confirmation + CTX- reference
```

Verified working:

- Price is recomputed server-side from the court record — a request posting
  `total: 1` is charged the real amount
- Overlapping bookings are rejected with `409`
- Past dates rejected with `400`
- Hand-edited checkout URLs fall back to a "pick another slot" screen

**Availability in this build is derived, not stored** — a deterministic hash of
`(courtId, date, hour)` weighted so evenings look busy. It's identical on server
and client, so nothing flashes on hydration. It is demo scaffolding, and
[`BOOKING_INTEGRATION_PLAN.md`](BOOKING_INTEGRATION_PLAN.md) § 2 covers replacing
it with a real query.

---

## Sample imagery

Twelve flat vector scenes, three per sport, in `public/images/sports/`:

```bash
node scripts/generate-sport-images.mjs
```

Built from the Courtix palette with perspective court geometry, film grain, and
scene lighting — a wide court view, an equipment detail, and an atmospheric
angle for each sport. Framed 4:3 at 800×600, the same aspect the layout expects,
so dropping in real host photography needs no layout changes.

These are stand-ins for real photos, not photographs.

---

## Architecture

```
src/
  app/
    (site)/          player-facing pages, shares nav + footer
    owner/           owner dashboard, sidebar layout
    admin/           super admin, sidebar layout
    api/             waitlist · bookings · availability
  components/        UI, dashboard/ for dashboard primitives
  lib/
    data/            sports, courts, dashboard figures
    server/          storage.ts — THE SWAP POINT
    availability.ts  slot derivation + pricing
    validation.ts    zod schemas, shared client/server
```

### Swapping the database

Everything persistent goes through the `Storage` interface in
`src/lib/server/storage.ts`. Implement it against Prisma or Firestore, return it
from `getStorage()`, and no page, component, or route changes.

```ts
STORAGE_DRIVER=json      # default, writes to data/*.json
STORAGE_DRIVER=postgres  # Phase 2
STORAGE_DRIVER=firebase  # Phase 2
```

The JSON driver is single-process and last-write-wins. Fine for a demo,
not for production — the plan covers enforcing slot uniqueness at the database
level, which is the only place it can actually be enforced.

---

## Design system

Ported 1:1 from the approved prototype. Tokens in `src/app/globals.css`:

| Token | Hex | |
|---|---|---|
| `court-deep` | `#0E2621` | page background |
| `court-green` | `#163832` | raised surfaces |
| `card` | `#122E29` | panels |
| `ball-yellow` | `#E4FF5C` | primary accent |
| `line-white` | `#F4F1E8` | text |
| `muted` | `#9FB3AD` | secondary text |
| `board-red` | `#E4572E` | warnings |
| `kitchen-blue` | `#2F5185` | pickleball |

Archivo Black (display) · Manrope (body) · IBM Plex Mono (data).

Respects `prefers-reduced-motion`. Focus rings are explicit — the browser
default is invisible on this palette.

---

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build (45 routes)
npm run start      # serve the build
npm run lint
npm run typecheck
```

---

## Status

Frontend is complete and builds clean. What is **not** real yet:

- Availability is derived, not queried
- No auth — `/owner` and `/admin` are open to anyone with the URL
- No payment — checkout confirms without charging
- Dashboard figures outside the waitlist and bookings views are static
- No emails or SMS

All of it is sequenced in
[`BOOKING_INTEGRATION_PLAN.md`](BOOKING_INTEGRATION_PLAN.md) — roughly six weeks
to a system that can take money safely.
