# Courtix — Booking Integration Plan

How the booking system goes from the current demo to something that can take
real money from real players without double-selling a court.

**Where we are:** the full frontend is built and the booking flow works
end-to-end against a JSON file. Availability is *derived* from a hash, not
stored. Nobody is charged. There is no auth.

**Where this ends:** a transactional booking system with real availability, slot
holds, online payment, host payouts, and an audit trail.

---

## 0. The one thing that must not break

**A court hour can be sold exactly once.**

Everything below is in service of that sentence. A double booking is not a
cosmetic bug — it means two teams show up at 7pm and the host has to turn one
away, which costs the host a customer and costs Courtix the host. Every phase
below is ordered so that this invariant gets stronger, never weaker.

The current demo **does not** guarantee it. `data/*.json` is last-write-wins:
two requests that read the file at the same time will both see the slot free and
both write. That's acceptable for a pitch demo and unacceptable the moment money
moves. Phase 2 fixes it at the database level, which is the only place it can
actually be fixed.

---

## 1. Current architecture

```
Browser
  │
  ├── /courts/[slug]  ─── BookingPanel (client)
  │                        └── slotsFor()  ← pure, deterministic
  │                        └── canBook()   ← duration must fit
  │                             ↓ router.push with date/start/hours
  │
  ├── /book/[slug]    ─── re-validates params server-side
  │                        └── CheckoutForm (client)
  │                             ↓ POST /api/bookings
  │
  └── /bookings/[ref] ─── reads storage, renders confirmation
```

### The pieces that already exist

| File | Role |
|---|---|
| `src/lib/availability.ts` | Derives slots, checks duration fit, computes the price quote |
| `src/lib/validation.ts` | Zod schemas shared by client and server |
| `src/lib/server/storage.ts` | **The swap point.** `Storage` interface + JSON driver |
| `src/app/api/bookings/route.ts` | Creates bookings; recomputes price; rejects taken slots |
| `src/app/api/availability/route.ts` | Slot grid for one court/day, merged with stored bookings |
| `src/app/api/waitlist/route.ts` | Waitlist capture with dedupe and honeypot |

### Two design decisions worth keeping

**Pricing is computed server-side, always.** `quote()` is called in the API
route from the court record — the client's numbers are display only. A request
that posts `total: 1` gets charged the real price. This is already tested.

**Validation schemas are shared.** The browser and the route import the same
zod schema, so the error a user sees is the error the server would produce.
The route re-validates regardless; client checks are a convenience.

---

## 2. Phase 1 — Real availability (replaces the hash)

Right now `slotsFor()` decides availability with an FNV-1a hash of
`(courtId, date, hour)`, weighted so evenings look busy. It exists so the demo
has a plausible-looking grid with no database.

**It must be deleted, not adapted.** Real availability is a query.

### Schema

```prisma
model Court {
  id        Int      @id @default(autoincrement())
  slug      String   @unique
  name      String
  sportId   String
  price     Int      // centavos, not pesos — never float money
  opens     Int
  closes    Int
  units     Int      // bookable courts/bays at this facility
  hostId    String
  // ...
  bookings  Booking[]
  blocks    Block[]
}

model Booking {
  id         String   @id @default(cuid())
  ref        String   @unique          // CTX-XXXXXX
  courtId    Int
  unitIndex  Int                       // which of the N units
  date       DateTime @db.Date
  startHour  Int
  hours      Int
  status     BookingStatus             // HELD | CONFIRMED | CANCELLED
  // ...

  @@index([courtId, date])
}

// Hours the host has taken off the market: maintenance, leagues, private hire.
model Block {
  id        String   @id @default(cuid())
  courtId   Int
  unitIndex Int
  date      DateTime @db.Date
  startHour Int
  hours     Int
  reason    String
}
```

### The availability query

```ts
async function slotsFor(court: Court, date: string): Promise<Slot[]> {
  const [bookings, blocks] = await Promise.all([
    db.booking.findMany({
      where: { courtId: court.id, date, status: { in: ["HELD", "CONFIRMED"] } },
      select: { unitIndex: true, startHour: true, hours: true },
    }),
    db.block.findMany({ where: { courtId: court.id, date } }),
  ]);

  // A slot is open while at least one unit is free.
  const busy = new Map<number, Set<number>>(); // hour -> unit indexes
  for (const b of [...bookings, ...blocks]) {
    for (let h = b.startHour; h < b.startHour + b.hours; h++) {
      if (!busy.has(h)) busy.set(h, new Set());
      busy.get(h)!.add(b.unitIndex);
    }
  }

  return range(court.opens, court.closes).map((hour) => ({
    hour,
    label: hourLabel(hour),
    taken: (busy.get(hour)?.size ?? 0) >= court.units,
  }));
}
```

**Note the multi-unit handling.** Kitchen Line Club has 2 courts; Tee Line has
20 range stalls. A slot is only "taken" when *every* unit is busy. The demo
ignores this — it treats a facility as one bookable thing. Getting this wrong
means selling 1 slot at a 20-stall range.

### What changes in the UI

`BookingPanel` currently calls `slotsFor()` synchronously because it's pure.
Once it's a query, the panel takes its initial grid from the server component
and refetches `/api/availability` when the date changes. The rest of the
component — duration fitting, quote, the disabled-slot rules — is unchanged.

---

## 3. Phase 2 — Making double-booking impossible

Application-level checks (`isSlotTaken()` before `addBooking()`) are a
**time-of-check-to-time-of-use race**. Two requests can both pass the check
before either writes. Under load this *will* happen.

The fix is a database constraint, so the second write fails no matter what the
application logic did.

### Option A — Exclusion constraint (Postgres, recommended)

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking" ADD COLUMN slot tsrange
  GENERATED ALWAYS AS (
    tsrange(
      date + (start_hour * interval '1 hour'),
      date + ((start_hour + hours) * interval '1 hour')
    )
  ) STORED;

ALTER TABLE "Booking" ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    court_id WITH =,
    unit_index WITH =,
    slot WITH &&
  ) WHERE (status IN ('HELD', 'CONFIRMED'));
```

Now overlapping bookings for the same unit are rejected by Postgres itself.
The API route catches the constraint violation and returns the 409 it already
returns today:

```ts
try {
  booking = await db.booking.create({ data });
} catch (e) {
  if (isExclusionViolation(e)) {
    return NextResponse.json(
      { message: "That slot was taken while you were checking out." },
      { status: 409 },
    );
  }
  throw e;
}
```

The client already handles 409 — `CheckoutForm` shows the message and offers a
link back to the picker. That path is built and tested.

### Option B — Firestore transaction

Firestore has no exclusion constraints, so serialise on a deterministic
document id instead:

```ts
// One doc per (court, unit, date, hour). Its existence IS the lock.
const slotId = `${courtId}_${unitIndex}_${date}_${hour}`;

await runTransaction(db, async (tx) => {
  for (const hour of hoursSpanned) {
    const ref = doc(db, "slots", `${courtId}_${unitIndex}_${date}_${hour}`);
    const snap = await tx.get(ref);
    if (snap.exists()) throw new SlotTakenError();
    tx.set(ref, { bookingRef, heldUntil });
  }
  tx.set(doc(db, "bookings", bookingRef), booking);
});
```

Slower and chattier than Option A, but correct. Pick this only if the rest of
the stack is already Firebase.

**Recommendation:** Postgres + Prisma. Bookings are relational, the reporting in
the owner and admin dashboards is all aggregate queries, and the exclusion
constraint solves the core invariant in one line of DDL.

---

## 4. Phase 3 — Slot holds

Today a slot is only claimed at the final POST. A player who spends 90 seconds
filling in the checkout form can lose the slot to someone faster — and only
finds out after typing everything.

**Create a `HELD` booking when checkout opens**, with a short TTL.

```
BookingPanel "Continue to checkout"
  → POST /api/holds  { courtId, date, startHour, hours }
  → creates Booking { status: HELD, expiresAt: now + 10min }
  → returns holdId
  → /book/[slug]?hold=<holdId>

CheckoutForm submit
  → POST /api/bookings { holdId, playerDetails }
  → flips HELD → CONFIRMED in the same transaction as payment capture
```

Expired holds are swept by a cron job (or a partial index that ignores rows past
`expiresAt`, so they stop blocking without needing deletion):

```sql
-- Holds older than their TTL simply stop counting.
WHERE status = 'CONFIRMED'
   OR (status = 'HELD' AND expires_at > now())
```

The countdown belongs in the UI: *"Slot held for 9:42"*. Without it, a hold that
silently expires is worse than no hold at all.

---

## 5. Phase 4 — Payment

Philippine market: **PayMongo** covers cards, GCash, GrabPay, and Maya in one
integration. This is the right call over Stripe here — GCash is not optional in
this market.

### Flow

```
1. POST /api/bookings  → booking created as HELD, payment intent created
2. Client confirms payment with PayMongo (redirect for e-wallets)
3. PayMongo → POST /api/webhooks/paymongo
4. Webhook verifies signature, flips HELD → CONFIRMED, sends confirmation email
5. Client polls /api/bookings/[ref] or lands on /bookings/[ref]
```

### Rules that are not negotiable

**The webhook is the source of truth, not the browser redirect.** A player who
closes the tab after paying must still get their booking. Never confirm on the
client's say-so.

**Webhook signatures must be verified.** An unauthenticated webhook endpoint is
a free-bookings endpoint.

**Webhooks must be idempotent.** PayMongo retries. Key on the payment intent id
and make a repeat delivery a no-op.

**Money is integers.** Store centavos. `price: 35000` not `price: 350.00`.
Floating-point pesos will produce a ₱0.01 discrepancy in payouts and someone
will spend a day finding it.

### Refunds

The 12-hour free-cancellation window stated across the UI (`/how-it-works`,
court pages, confirmation page) must be enforced in one place:

```ts
function refundAmount(booking: Booking, now: Date): number {
  const start = slotStart(booking);
  const hoursUntil = (start.getTime() - now.getTime()) / 3_600_000;
  return hoursUntil >= 12 ? booking.total : 0;
}
```

Cancellation reverses the commission too — the host doesn't keep a fee on a
booking that didn't happen.

---

## 6. Phase 5 — Auth and authorisation

Currently `/owner` and `/admin` are open to anyone who types the URL. They are
noindexed, which is not a security control.

**NextAuth (Auth.js)** with email magic links plus Google. Passwords are a
liability nobody needs here.

```ts
type Role = "PLAYER" | "OWNER" | "ADMIN";
```

Enforce in middleware, not in components:

```ts
// middleware.ts
export const config = { matcher: ["/owner/:path*", "/admin/:path*"] };
```

Then scope every owner query by the session's host id. `/owner/bookings`
currently lists *all* bookings in storage — that is correct for a demo with one
host and a data leak the moment there are two.

**This is the single most important thing to get right when the dashboards stop
being a demo.**

---

## 7. Phase 6 — Wiring the dashboards to real data

Everything in `src/lib/data/dashboard.ts` is static. Each constant maps to a
query:

| Constant | Replacement |
|---|---|
| `OWNER_KPIS` | `COUNT`/`SUM` over bookings for `hostId`, current month vs. previous |
| `OWNER_WEEK` | Bookings grouped by weekday ÷ available slots that day |
| `OWNER_UPCOMING` | `WHERE date >= today AND status = CONFIRMED ORDER BY date, startHour` |
| `OWNER_PAYOUTS` | Aggregated per payout period from a `Payout` table |
| `ADMIN_KPIS` | Platform-wide aggregates |
| `ADMIN_APPROVALS` | `WHERE facility.status = 'PENDING_REVIEW'` |
| `ADMIN_DISPUTES` | A real `Dispute` table with SLA timestamps |

`/admin/waitlist` and `/owner/bookings` already read live storage — use them as
the pattern for the rest.

Dashboard aggregates get expensive fast. Cache with `unstable_cache` and a
5-minute TTL; nobody needs second-accurate revenue figures.

---

## 8. Phase 7 — Notifications

| Trigger | To | Channel |
|---|---|---|
| Booking confirmed | Player | Email + SMS |
| Booking confirmed | Host | Email + push |
| Cancellation | Both | Email |
| 2 hours before slot | Player | SMS |
| Payout sent | Host | Email |
| City launched | Waitlist | Email |

**Resend** for email, **Semaphore** or **Twilio** for SMS (Semaphore is cheaper
for PH numbers and handles the local sender-id registration).

That last row is the payoff for the waitlist CTA: `/admin/waitlist` already
groups signups by city, which is exactly the segment to mail when a city goes
live.

---

## 9. Replacing the storage driver

`getStorage()` in `src/lib/server/storage.ts` is the only place that needs to
change. Nothing above it imports a database.

```ts
export function getStorage(): Storage {
  switch (process.env.STORAGE_DRIVER) {
    case "postgres": return prismaStorage;
    case "firebase": return firebaseStorage;
    case "json":
    default:         return jsonStorage;
  }
}
```

Keep the JSON driver. It makes the app runnable with zero setup, which matters
for demos, onboarding a new developer, and CI.

---

## 10. Sequencing

| Phase | Work | Blocks | Est. |
|---|---|---|---|
| 1 | Postgres + Prisma, real availability query | everything | 1 week |
| 2 | Exclusion constraint, 409 handling | payment | 2 days |
| 3 | Slot holds + expiry sweep | payment | 3 days |
| 4 | PayMongo, webhooks, refunds | launch | 1.5 weeks |
| 5 | Auth, roles, per-host scoping | launch | 1 week |
| 6 | Dashboard queries | — | 1 week |
| 7 | Email + SMS | launch | 4 days |

**Roughly 6 weeks to a system that can take money safely.**

Phases 1→2→4 are the critical path. Phase 6 is the only one that can slip
without blocking launch — static dashboards are survivable for a pilot with a
handful of hosts; taking payment for a court you might double-sell is not.

### Before any real money moves

- [ ] Exclusion constraint live and proven with a concurrent-write test
- [ ] Webhook signature verification
- [ ] Webhook idempotency
- [ ] Money stored as integer centavos
- [ ] Owner queries scoped by session host id
- [ ] Refund policy enforced in exactly one function
- [ ] Load test: 50 concurrent bookings on one slot → exactly 1 succeeds

That last item is the acceptance test for section 0. If it doesn't pass, nothing
else in this document matters.
