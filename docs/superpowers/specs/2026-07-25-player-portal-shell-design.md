# Courtix — Player portal: shell, dashboard, profile (Chunk A)

**Date:** 2026-07-25
**Status:** approved, ready for implementation planning

Chunk A of four. It builds the `/account` portal shell, the player dashboard
with its eight metrics, and Edit Profile. Chunks B–D hang off this foundation.

Reference: the PickleHub player portal, two screenshots supplied by the user —
a top-nav avatar dropdown and a sidebar dashboard. See also
[`PICKLEHUB_REFERENCE.md`](../../../PICKLEHUB_REFERENCE.md).

---

## Context

Phase 1 (auth) is complete: players log in, sessions live in MySQL, and
`requireUser()` / `requireRole()` gate the protected routes. The player's only
page today is `/player-home`, a single scrolling page with a greeting, four
stat tiles, upcoming bookings, suggested courts and open plays.

The portal replaces that with a proper account section.

### The four chunks

| | Chunk | Contents |
|---|---|---|
| **A** | **Shell, dashboard, profile — this document** | `/account` layout, avatar dropdown, 8 tiles, progress panels, Edit Profile |
| B | Bookings + open plays | list, filter, detail, cancel — through the Storage seam |
| C | Wallet | `Wallet` + `WalletEntry` schema, ledger, top-up, history |
| D | Support, notifications, legal | `SupportTicket` + `SupportMessage`, notification bell, static pages |

### Decisions already taken

- **Wallet is a stored credit balance** backed by an append-only ledger (chunk C).
- **Support tickets get their own tables**; `Dispute` stays booking-scoped with
  its SLA (chunk D).
- **Booking data flows through the existing `Storage` seam**, not Prisma
  directly, so the phase 2 cutover swaps one implementation and changes no page.
- **Calories are an estimate** from a per-sport kcal/hour rate, labelled as such.

---

## 1. Routes

```
/account                  Dashboard              (chunk A)
/account/profile          Edit Profile           (chunk A)
/account/bookings         My Bookings            (chunk B)
/account/open-plays       My Open Plays          (chunk B)
/account/wallet           Wallet                 (chunk C)
/account/notifications    Notifications          (chunk D)
/account/support          Help + report an issue (chunk D)
/account/tickets          My tickets             (chunk D)

/privacy  /terms  /cookies  /contact              (chunk D, public)
```

Legal and contact pages live in `(site)`, not under `/account`: they must be
readable signed-out. The sidebar links out to them.

**The sidebar only renders links whose pages exist.** Each later chunk adds its
own entries. A nav that 404s is worse than a shorter nav. Concretely, chunk A
ships:

| Section | Chunk A items |
|---|---|
| YOUR ACCOUNT | Player Dashboard, Edit Profile |
| QUICK ACTIONS | Book a Court (`/courts`), Join Open Play (`/open-plays`) |
| SUPPORT & LEGAL | *not rendered — every entry belongs to chunk D* |

The avatar dropdown follows the same rule: in chunk A it shows the name/email
header, Dashboard, Edit Profile, and Sign Out.

### Moving off `/player-home`

`/player-home` becomes a permanent redirect to `/account`. Four things change
with it, and all four must move together or the redirect loops:

| File | Change |
|---|---|
| `src/lib/auth-routes.ts` | `homeFor("PLAYER")` returns `/account` |
| `src/middleware.ts` | matcher `/player-home` → `/account/:path*` |
| `src/components/SiteFooter.tsx` | "Your home" link → `/account` |
| `src/app/(site)/player-home/page.tsx` | replaced by a redirect stub |

---

## 2. The shell

### Sidebar

`DashSidebar` already serves `/owner` and `/admin`. The player sidebar needs
**grouped sections** ("YOUR ACCOUNT", "QUICK ACTIONS", "SUPPORT & LEGAL"), which
it does not support today.

Change its `items: NavItem[]` prop to `sections: NavSection[]`:

```ts
export interface NavSection {
  /** Rendered as a small uppercase label. Omit for an unlabelled group. */
  title?: string;
  items: NavItem[];
}
```

Owner and admin pass a single untitled section, so they render exactly as they
do now. This is the smallest change that serves all three portals; the
alternative — a second sidebar component — would duplicate the mobile sheet,
the active-link logic and the sign-out form.

### User card

Above the nav: a circular avatar of the player's initials, their name, email,
and a role badge reading "Player". Initials come from the name — "Rex I.T
Support" → "RI" — via a shared `initialsOf(name)` helper, because the avatar
dropdown needs the same thing.

### Avatar dropdown in the top nav

`SiteNav` currently renders the player's first name as a plain button. It
becomes an avatar button opening the menu from the first screenshot: name and
email header, then Dashboard / Edit Profile / My Bookings / Wallet /
Notifications, then the support group, then Sign Out in red.

Like the sidebar, it lists only what exists in the current chunk.

It is a client component — it needs open/close state and outside-click
dismissal — and receives the account as a prop from `(site)/layout.tsx`, which
already reads the session. Sign Out posts to the existing `logoutAction`.

**Accessibility:** the trigger carries `aria-expanded` and `aria-haspopup="menu"`;
Escape closes it and returns focus to the trigger; the menu is keyboard
navigable. This is a real menu, not a hover card.

---

## 3. The dashboard

### Layout

Greeting header, then eight stat tiles in a 4-across grid (two rows), then a
two-column progress section.

The tiles in the reference have an icon and a coloured underline; the existing
`KpiRow` in `src/components/dashboard/parts.tsx` has neither. Rather than
overload `KpiRow` — owner and admin depend on its current look — chunk A adds a
sibling `StatTile` / `StatGrid` in the same file, and deletes the ad-hoc
`StatTile` currently defined at the bottom of `player-home/page.tsx`.

### The eight metrics

All derive from the player's bookings and open-play joins. No new tables.

| Tile | Definition |
|---|---|
| Total Bookings | non-cancelled bookings |
| Upcoming | bookings with `date >= today` |
| Open Plays | confirmed open-play joins |
| Hours Played | Σ `hours` over sessions already past |
| Total Sessions | past bookings + past open plays |
| Week Streak | consecutive ISO weeks, counting back from the current one, with ≥1 session |
| Cal This Month | Σ `rate(sport) × hours` for sessions in the current calendar month |
| Avg Cal/Session | total calories ÷ total sessions; 0 when there are none |

Progress panels: **Calories Burned** (this month, with its estimate footnote)
and **Courts Explored** (count of distinct `courtId` values across all sessions).

### Calorie rates

```ts
// kcal/hour, from published MET values for a ~70 kg adult.
const KCAL_PER_HOUR: Record<SportSlug, number> = {
  pickleball: 500,
  badminton: 450,
  basketball: 580,
  golf: 250,
};
```

Every surface showing a calorie figure carries: *"Estimated from session length
and sport."* Courtix does not measure calories and must not imply it does.

### Where the numbers come from

```
/account (server component)
  → requireUser()
  → getStorage().listBookings()      ─┐ the seam: JSON today,
  → getStorage().listOpenPlayJoins() ─┘ Prisma after phase 2
  → playerSessions(bookings, joins, player.email)   pure
  → playerStats(sessions, now)                      pure
```

`playerSessions` filters and normalises both sources into one
`PlayerSession[]`; `playerStats` reduces that to the metrics. Both are pure
functions in `src/lib/player-stats.ts` with no imports from `next` or Prisma,
which is what makes the metrics unit-testable.

```ts
export interface PlayerSession {
  kind: "booking" | "open-play";
  sport: SportSlug;
  /** Matches the existing domain type's `courtId`. Phase 2 unifies court and
   *  facility ids; until then this stays an integer. */
  courtId: number;
  date: string;      // ISO, YYYY-MM-DD
  hours: number;
  past: boolean;
}
```

---

## 4. Edit Profile

One form, one server action, writing to `user`, `playerProfile` and
`playerSport` in a single transaction.

| Field | Column | Notes |
|---|---|---|
| Name | `user.name` | required, 2–80 chars |
| Phone | `user.phone` | optional; PH mobile format when present |
| Home city | `playerProfile.homeCityId` | select from `city` where `status = LIVE` |
| Skill | `playerProfile.skill` | BEGINNER / INTERMEDIATE / ADVANCED |
| DUPR rating | `playerProfile.rating` | optional, 1.00–8.00, self-reported |
| Favourite sports | `playerSport` | multi-select over `sport` |

**Email is displayed read-only.** It is the login identifier; changing it needs
a verification flow that belongs with password reset, not here.

A player who somehow has no `playerProfile` row gets one created on first save,
so the page cannot 500 for an account created outside the seed.

Validation is a zod schema shared by the client and the action, matching the
existing pattern in `src/lib/validation.ts`. The action returns field errors;
success re-renders with a confirmation and revalidates `/account`.

---

## 5. Error handling

| Case | Behaviour |
|---|---|
| Signed out | middleware redirects to `/login?next=/account/...` |
| Signed in, no `playerProfile` | dashboard renders zeros; profile save creates the row |
| Owner or admin opens `/account` | allowed — every user has an account area; the dashboard simply shows no sessions |
| No sessions yet | tiles read 0 and the progress panels show the reference empty states, not blank boxes |
| Storage read fails | the page throws to the nearest error boundary rather than rendering fake zeros |
| Profile save conflict | field-level errors returned; the typed values are preserved |

---

## 6. Testing

The metrics are pure and deserve real tests — they are where a silent
off-by-one costs a player's streak.

| Test | Why |
|---|---|
| `playerStats` over a fixture of sessions produces every expected tile | the core calculation |
| Week streak: consecutive weeks count; a gap week ends it; this week alone is 1 | the subtlest rule |
| Week streak is 0 with no sessions, and unaffected by future-dated sessions | boundaries |
| `Avg Cal/Session` is 0 rather than `NaN` when there are no sessions | division by zero |
| `caloriesFor` multiplies the right per-sport rate by hours | the estimate itself |
| `playerSessions` matches on email case-insensitively and drops cancelled bookings | the filter feeding everything |
| `initialsOf` handles one word, three words, and extra whitespace | avatar correctness |

Verified by running the app: sign in as the seeded player, confirm the sidebar,
the dropdown, the tiles against known seed data, a profile edit round-trip, and
that `/player-home` redirects.

---

## 7. Out of scope for chunk A

- Bookings, open plays, wallet, notifications, tickets, legal pages — chunks B–D
- **Quick Play**, **Find Clubs**, **Community**, **Tournaments** from the
  reference: Courtix has no such features, and stubbing them would add dead
  navigation
- Avatar image upload — `user.image` exists but initials are enough here
- Changing email or password

---

## 8. Definition of done

- [ ] `/account` renders the sidebar, user card and role badge
- [ ] Eight tiles compute correctly from real stored bookings and joins
- [ ] Both progress panels render, with the calorie estimate footnote
- [ ] Edit Profile round-trips every field and creates a missing profile row
- [ ] Avatar dropdown opens, is keyboard accessible, and signs out
- [ ] `/player-home` redirects to `/account`; footer and `homeFor` agree
- [ ] Owner and admin sidebars are visually unchanged
- [ ] vitest covers the metrics; `npm run lint` and `npm run typecheck` clean
