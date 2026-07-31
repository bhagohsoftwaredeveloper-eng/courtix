# Host Onboarding and Court Listing Design

**Date:** 2026-07-31
**Status:** approved design, not yet implemented
**Depends on:** `feat/dual-role-identity` — uses `requireOwner()`,
`requirePlatformRole()`, `SignupInput` and `createSession()`, none of which are
on `main`. Independent of `feat/wallet-and-points`.

## 1. Goal

Let a court owner sign up, prove who they are, and list a real court that
players can find — replacing a flow that today stops halfway.

A visitor becomes a host in one unbroken three-step wizard: create an account,
give their business details, then describe their venue. A platform admin
reviews the submission, and on approval the court appears in the public
directory alongside the existing catalogue.

## 2. What exists, and what does not

| Thing | State |
|---|---|
| `/list-your-court/start` | works — creates an `Organization` + `OrganizationMember`, granting owner access |
| `Facility`, `CourtUnit`, `OpeningHour`, `FacilityImage` models | fully modelled in `prisma/schema.prisma` |
| Anything that **writes** a `Facility` | **does not exist** — grepped `src/`, zero writes |
| `/owner/courts` | a demo page: `const OWNED_IDS = [1, 5, 8]` filtered from the static catalogue, identical for every owner, with a dead `+ Add court` button |
| `/admin/approvals` | a mock reading a static `ADMIN_APPROVALS` array; `FacilityStatus` is referenced nowhere in `src/` |
| Public `/courts` | reads the static array `COURTS` from `src/lib/data/courts.ts`, not the database |
| The `Facility` table itself | **already holds the whole catalogue** — all 14 static courts as `APPROVED` rows with identical slugs, each with its description, price, hours, 3 images pointing at the same `/images/sports/*.svg` paths, amenities, court units and sport. The seed writes them. |
| A review queue to build against | already seeded: `demo-pending-northgate` (`DRAFT`), `demo-pending-riverside` and `demo-pending-smash-lab` (`PENDING_REVIEW`) |
| Image upload machinery | `validateAvatar`/`sniffImageType` plus a blob-serving route at `/api/avatar/[userId]` |

Two consequences drive the design:

- **A `Facility` row would be invisible today.** The public directory reads a
  TypeScript array, so a created facility would be write-only. The merge in §8
  is what makes listing meaningful rather than theatre.
- **A new host currently sees three courts that are not theirs.** That is a
  live falsehood in the product, and §7 removes it.

## 3. Decisions taken

| Question | Decision |
|---|---|
| Should a new court appear publicly? | **Yes — the directory reads `APPROVED` facilities from the database, and the static `COURTS` array is retired.** Superseded an earlier "merge" decision: since the table already holds the same 14 slugs, merging would have rendered every court twice. |
| Live immediately, or reviewed? | **Admin must approve.** The mock approvals page becomes real. |
| Photos required? | **Optional**, falling back to the existing sport artwork. No document or ID uploads anywhere. |
| Does step 1 create the account? | **Yes — signup inline**, skipped entirely when already logged in. |
| What verification data? | **Business identity + payout account.** |

## 4. The wizard

Three steps at `/list-your-court/start`, replacing today's single form.

| Step | Writes | Effect |
|---|---|---|
| 1 · Account | `User`, `PlayerProfile`, session | Signup inline. Skipped when a session already exists. |
| 2 · Profile | `Organization`, `OrganizationMember` | Business identity, verification, payout. **Owner access is granted here.** |
| 3 · Clubs | `Facility`, `CourtUnit[]`, `OpeningHour[]` | The venue and its courts, created `DRAFT`, then submitted. |

**Each step commits before advancing.** Step 2 is long, and a refresh, a dropped
connection or a mistyped field must never empty it. This also makes the wizard
**resumable**: the entry point inspects what the account already has and opens
at the first incomplete step.

```
no session                        → step 1
session, no OrganizationMember    → step 2
membership, no Facility           → step 3
membership + Facility             → /owner/courts
```

That rule is a pure function, `wizardStep()`, so every branch is unit-testable
without a database.

**Owner access is granted at the end of step 2**, before any court exists. That
matches today's behaviour and is deliberate: a host who abandons at step 3 still
reaches `/owner`, where their empty courts page invites them to finish.

## 5. Data model

`Facility`, `CourtUnit` and `OpeningHour` need no changes. Two additions:

### 5.1 Organization gains verification and payout fields

```prisma
enum EntityType {
  SOLE_PROP
  PARTNERSHIP
  CORPORATION
}

enum PayoutMethod {
  BANK
  GCASH
  MAYA
}
```

```prisma
// On model Organization — every field nullable, because the 14 seeded orgs and
// any created before this feature have none of it.
  legalName      String?       // registered name, when it differs from the trade name
  entityType     EntityType?
  registrationNo String?       // DTI for a sole proprietorship, SEC otherwise
  permitNo       String?       // Mayor's / business permit number
  permitCity     String?       // the LGU that issued it
  tin            String?

  // Business address. Free text rather than a City relation: City is a curated
  // list gating where Courtix operates, and a business may be registered
  // somewhere Courtix has not launched. The facility's location in step 3 is
  // the one that must be a curated City, because the directory filters on it.
  addressLine    String?
  barangay       String?
  addressCity    String?
  province       String?
  postalCode     String?

  // Authorised representative — the human an admin calls to verify.
  repName        String?
  repPosition    String?
  repMobile      String?

  payoutMethod      PayoutMethod?
  payoutAccountName String?

  // Set when an admin has checked the details against public registries.
  verifiedAt     DateTime?
```

The existing `payoutBankName` and `payoutRef` are reused rather than duplicated:
`payoutBankName` holds the bank or e-wallet name, and `payoutRef` holds the last
four digits — exactly what its own comment already specifies.

### 5.2 FacilityImage gains bytes

`FacilityImage` currently holds a `url`, but Courtix has no CDN and its working
upload pattern stores bytes — `UserAvatar` plus the blob route at
`/api/avatar/[userId]`. Photos follow that proven path rather than inventing a
second one:

```prisma
// On model FacilityImage — url stays for a future CDN; data is what is used now.
  data     Bytes?  @db.LongBlob
  mimeType String?
```

Uploads reuse `sniffImageType()` and the size and type rules already in
`src/lib/image-upload.ts`, so a renamed executable cannot enter as a JPEG. A
facility with no image falls back to the sport artwork the demo courts use, so
the directory never renders a broken card.

These are photographs of a venue, not identity documents — ordinary public
listing content, and unrelated to the sensitive data in §6.

### 5.3 Facility gains a decline reason

```prisma
  // Why an admin declined, shown to the host so they can fix and resubmit. A
  // decline with no reason is a dead end.
  declineReason String? @db.Text
```

## 6. Handling the sensitive data

Permit numbers, TINs and payout details are regulated personal data under the
Philippine Data Privacy Act (RA 10173). The design treats them accordingly.

- **No full bank account numbers are stored.** Only the bank or e-wallet name,
  the account holder's name, and the last four digits. `Organization.payoutRef`
  already carries the instruction *"tokenised — never store raw bank numbers in
  prod"*, and there is no payment provider to tokenise against, so a full number
  could not be used even if held. Capturing it in full waits for the payout
  integration, where it belongs.
- **No document or ID uploads.** There are no permit scans and no government
  IDs, so there is no sensitive imagery to secure, serve or retain. An admin
  verifies the typed numbers against public registries instead. The optional
  facility photo in §5.2 is not an exception: it is a picture of a court, public
  by intent, and carries none of this weight.
- **Never public.** Verification and payout fields are readable only by the
  owning host and by platform admins. No public query selects them, and
  `facilityToCourt()` in §8 cannot leak them because it takes only the facility.
- **Masked on redisplay.** A field already stored comes back as `••••••789` or
  `•••• 4821` rather than in full, so a shoulder-surfed screen gives nothing
  away. The full value is only ever in the browser at the moment it is typed.
- **`/privacy` gains a host-verification section** naming what is collected, why,
  and how long it is kept. The page currently says nothing about it, which will
  not do once the first permit number is stored.

## 7. Lifecycle and approval

```
DRAFT ──host submits──▶ PENDING_REVIEW ──admin approves──▶ APPROVED ──▶ public
                                       └─admin declines──▶ DECLINED
                                                             │
                                                     host edits, resubmits
```

`/owner/courts` stops filtering the static catalogue and lists the host's own
facilities with a status chip. A host with none sees an empty state, not three
courts belonging to nobody, and the `+ Add court` button becomes a real link.

`/admin/approvals` stops reading its static array and lists real
`PENDING_REVIEW` facilities, each showing the owning organization's verification
details so an admin has something to check. Approve sets `APPROVED` and stamps
`Organization.verifiedAt`. Decline sets `DECLINED` and requires a reason.

`SUSPENDED` is left unused by this design: it exists for taking a live listing
down, which is a separate action from reviewing a new one.

## 8. The public directory reads the database

The `Facility` table already holds all 14 catalogue courts as `APPROVED` rows
with the same slugs, the same images and the same prices. So there is nothing to
merge and nothing to migrate: `/courts` simply queries the table, and
`src/lib/data/courts.ts` is deleted.

**An earlier version of this design merged the two sources.** That is now
rejected outright: rendering `[...COURTS, ...facilities]` would show every court
twice, because both sides carry the same 14 slugs. Even a de-duplicating merge
would leave two sources of truth for one court, where editing either lets them
disagree silently.

A pure adapter keeps the components untouched:

```ts
export function facilityToCourt(facility: FacilityForDirectory): Court;
```

It maps a facility row into the exact `Court` shape `CourtDirectory`, its
filters and its cards already render, so no component changes. Being pure, the
mapping is unit-testable without a database.

**One wrinkle, resolved here.** `Court.id` is a `number`, while a facility has a
string cuid. `id` serves as a React key and indexes the `slotsLeft` lookup;
every route already goes through `slug`, which is unique. So `slug` becomes the
key — `slotsLeft` is keyed by slug and lists key on slug — and `Court.id` is
dropped, since the static array that needed it is gone.

Only `APPROVED` facilities are listed. `DRAFT` and `PENDING_REVIEW` are visible
to the owning host and to admins, and to nobody else.

## 9. Surfaces

| Route | Gate | Contents |
|---|---|---|
| `/list-your-court/start` | none — step 1 is public | The wizard; resumes at the first incomplete step |
| `/owner/courts` | `requireOwner()` | The host's real facilities with status chips; working `+ Add court` |
| `/owner/courts/new` | `requireOwner()` | Step 3's form again, for a second venue |
| `/admin/approvals` | `requirePlatformRole()` | Real pending facilities with the org's verification details; Approve / Decline |
| `/courts` | public | Static catalogue **+** approved facilities |

## 10. Validation

Zod schemas shared by each step's form and action, following the signup and
organization pattern already in the codebase.

- **Step 1** reuses `SignupInput` unchanged, plus a confirm-password field that
  must match. Reuse matters: the rules a host meets must be the rules a player
  meets, or the two signup paths drift.
- **Step 2** — business name 2–120 characters; email normalised and valid;
  mobile `^09\d{9}$` like every other phone in the app; TIN 9–12 digits;
  permit and registration numbers 3–40 characters; representative name and
  position required; payout account name required; last four digits exactly 4
  digits.
- **Step 3** — facility name 2–120; description 20–2000, since it is what a
  player reads before booking; city from the curated `City` list; address
  required; primary sport from the seeded `Sport` list; hourly price in pesos
  converted to integer centavos by the string-matching parser already used by
  the wallet, never by float multiplication; opening hour 0–23 and closing hour
  1–24 with close strictly after open; court count 1–40; optional photo checked
  by `sniffImageType()` against the size and type rules already in
  `src/lib/image-upload.ts`.

Every failure returns inline state with the typed values echoed back.

## 11. Testing

Pure functions carry the logic, so the tests need no database:

- `wizardStep()` — every combination of session, membership and facility.
- `facilityToCourt()` — field mapping; centavos to the directory's peso `price`;
  photo fallback to sport artwork when the facility has no image; amenities and
  units derived from `CourtUnit[]`.
- Step 2 and step 3 schemas — each rule above, both sides of every boundary.
- Masking helpers — a TIN and a payout reference render masked, and a value that
  is absent renders as absent rather than as a row of dots.

Manual verification follows the signup pattern: the wizard walked end to end
signed out, resumed mid-way, and each gate checked as player, owner and admin.

## 12. Phasing

Four phases. Each leaves the product honest, which matters because the current
state is not.

1. **Wizard steps 1–2** — signup inline, organization with verification and
   payout, resumable entry. Replaces today's single form.
2. **Step 3 and the owner's courts** — facility and court units, real
   `/owner/courts`, `+ Add court`. **Removes the three demo courts**, so this
   phase ends the falsehood even before anything is public.
3. **Admin approval** — real `/admin/approvals`, approve and decline with a
   reason.
4. **Directory on the database** — `facilityToCourt()`, slug keying, `/courts`
   querying `APPROVED` facilities, and `src/lib/data/courts.ts` deleted.

**Phase 4 no longer depends on phase 3.** That dependency existed only while the
directory was a merge fed by newly approved courts; now that the table already
holds 14 `APPROVED` rows, the directory switch stands alone and could run first.
Keeping it last is a sequencing preference, not a constraint — it is the phase
that touches pages players already use, so it benefits from going in once the
host-facing work is settled.

## 13. Out of scope

- **Document and ID uploads** — deliberately excluded; §6 explains why.
- **Full bank account numbers** — wait for the payout integration.
- **Editing a facility after approval** — a host can edit while `DRAFT` or
  `DECLINED`; changing a live listing is a separate concern with its own
  re-review question.
- **Amenities, multiple sports per facility, per-weekday opening overrides** —
  the models exist; the wizard sets one primary sport and one opening window.
- **Multiple photos per facility** — step 3 accepts one, and the remaining
  gallery slots fall back to sport artwork. A full gallery manager is separate.
- **Migrating the 14 demo courts to MySQL** — not needed: the seed already put
  them there, which is what made §8 a deletion rather than a migration.
- **`SUSPENDED` listings, payouts, and wallet-paid bookings** — separate work.
