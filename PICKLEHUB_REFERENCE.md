# PickleHub → Courtix — Concrete Reference

Courtix is benchmarked against **[PickleHub](https://picklehub.ph)**, a live
Philippine pickleball platform. This document maps what PickleHub does to what
Courtix now does, so the product is grounded in a real comparable rather than an
abstract idea.

Two PickleHub pages set the reference:

- Homepage — <https://picklehub.ph/>
- Player portal — <https://picklehub.ph/player-home>

**Design stance:** Courtix adopts PickleHub's *information architecture and
feature set*, not its visual style. PickleHub is a light, clean interface;
Courtix keeps its own approved dark court-green + ball-yellow identity. The
concepts are the reference; the brand stays Courtix.

---

## What PickleHub does

> "Simplifying pickleball court bookings and open play management across the
> Philippines."

Its model has two halves that matter:

1. **Court booking** — find and book courts by the hour. Courtix already did
   this from day one.
2. **Open plays** — organized drop-in sessions a player joins *individually*,
   pays per head for, and shows up to. This is the social layer that court
   rental alone doesn't cover, and it was the biggest gap in Courtix.

Plus tournaments, coaches, and community — noted below as roadmap.

---

## Feature mapping

| PickleHub | Courtix | Status |
|---|---|---|
| Homepage hero: "Book a Court" / "Find a Game" | `/` hero: "Book a court" / "Find a game" | ✅ Added |
| "Happening This Week" live feed | `/` "Happening this week" — open plays teaser | ✅ Added |
| Open Plays (join, capacity, skill, per-head price) | `/open-plays` + `/open-plays/[id]` | ✅ Added |
| "6/6 Full" seat counter | `SeatMeter` — live filled/capacity | ✅ Added |
| Skill levels (All Levels, etc.) | `SkillLevel` — Beginner / Intermediate / Advanced / All Levels | ✅ Added |
| "Join" / "Join Waitlist" on full sessions | `JoinOpenPlay` — auto waitlist when full | ✅ Added |
| FastPay indicator on cards | `fastPay` badge on open plays | ✅ Added |
| Player portal (`/player-home`) | `/player-home` | ✅ Added |
| "Ready to play ☀️" greeting | `/player-home` time-aware greeting | ✅ Added |
| "Suggested Courts" carousel | `CourtCarousel` on `/player-home` | ✅ Added |
| "Upcoming Open Plays" on portal | `/player-home` "Open plays for you" | ✅ Added |
| Court cards: "Starts at ₱265/hr", location | `CourtCard` — already had this | ✅ Existing |
| Statistics ("Active Players", etc.) | `/` stat row + owner/admin KPIs | ✅ Existing |
| "For Club Operators" — free listing | `/list-your-court` + owner dashboard | ✅ Existing |
| Court booking + FastPay | Full booking flow + checkout | ✅ Existing |
| Tournaments | — | ⏳ Roadmap |
| Coaches (new badge) | — | ⏳ Roadmap |
| Community / player profiles | Player model exists; social feed not built | ⏳ Roadmap |

---

## Where Courtix goes further than PickleHub

Courtix isn't only pickleball, and the reference is adapted accordingly:

- **Four sports, not one.** Pickleball, badminton, basketball, and golf. Open
  plays span pickleball, badminton, and basketball pickup runs; golf stays
  booking-only (there's no "drop-in" golf bay session).
- **Real, enforced booking.** The booking flow recomputes price server-side and
  rejects double-bookings with a 409 — verified with concurrent requests. The
  reference is UX; the correctness guarantees are Courtix's own.
- **Owner + super-admin dashboards.** PickleHub's public site shows the player
  and operator marketing; Courtix ships the actual owner and platform-admin
  consoles behind them.

---

## New surfaces added for this reference

### `/open-plays` and `/open-plays/[id]`

Drop-in sessions grouped by day. Each has a host venue, date/time, skill band,
per-player price, and a live seat count. Joining takes one seat; a full session
routes you to the waitlist automatically.

- Data: [src/lib/data/openplays.ts](src/lib/data/openplays.ts) — dates are
  day-offsets resolved at read time, so the week is always fresh.
- Live seats: [src/lib/server/openplay-status.ts](src/lib/server/openplay-status.ts)
  — seeded count + real joins from storage, capped at capacity (reads "6/6 Full",
  never "9/6").
- Join API: [src/app/api/open-plays/join/route.ts](src/app/api/open-plays/join/route.ts)
  — validates, dedupes by email, decides seat vs. waitlist from the *live* count.

### `/player-home`

The logged-in player's landing, mirroring `picklehub.ph/player-home`:

- Time-aware "Ready to play" greeting
- Player strip — DUPR-style rating, upcoming count, favourite sports
- **Your upcoming bookings** — real bookings pulled from storage by the player's
  email, not a mock list
- **Suggested courts** — saved courts first, then top-rated in the player's
  sports, in a scroll-snap carousel
- **Open plays for you** — filtered to the player's sports

The player identity is a demo profile in
[src/lib/data/player.ts](src/lib/data/player.ts), read through
`getCurrentPlayer()`. That's the single seam auth replaces — see
[BOOKING_INTEGRATION_PLAN.md](BOOKING_INTEGRATION_PLAN.md) Phase 5.

---

## Try the reference end to end

1. **`/`** — hero now reads "Book a court / Find a game"; scroll to "Happening
   this week".
2. **`/open-plays`** — sessions grouped by day, live seat meters. Full ones
   (e.g. *After-Work Rally*, 12/12) show "Join waitlist".
3. **Open any session → Join** — submit; a seat confirms, a full one waitlists.
   Reopen and the seat count has moved.
4. **`/player-home`** — book a court first (`/courts`), then return: your
   booking is listed under "Your upcoming bookings", because both read the same
   storage as `jomar.r@example.ph`.

---

## Not copied, deliberately

- **PickleHub's light theme.** Courtix's dark identity was approved in the
  prototype; a second theme would fork the design system for no product reason.
- **PickleHub's exact copy and branding.** The words and logo are theirs. Courtix
  uses the reference for *structure*, and writes its own voice.
- **Tournaments and coaches.** Real features, but out of scope for this pass —
  logged as roadmap so the mapping stays honest about what's built versus
  planned.
