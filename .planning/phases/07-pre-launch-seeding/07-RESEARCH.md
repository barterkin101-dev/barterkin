# Phase 7: Pre-Launch Seeding - Research

**Researched:** 2026-04-21
**Domain:** Admin seeding scripts (Supabase service-role) + operational outreach + pre-launch verification
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Outreach & consent capture**

- **D-01:** Outreach method is **TikTok DM + Google Form**. Warm personal DM to each of the 11 listings, referencing the specific listing by name. DM includes a Google Form link for consent capture.
- **D-02:** Reply-to contact is **hello@barterkin.com** (branded domain email). Requires Resend domain + barterkin.com DNS to be live before outreach. Include this address in the DM so people who prefer not to use the form can email directly.
- **D-03:** DM tone is **warm and personal** — sign as Ashley, reference the specific listing content, use first-person. Not a brand blast. Each of the 11 DMs should feel individually written even if based on a shared template.
- **D-04:** Google Form captures: consent Y/N, display name / any updates, skills offered (up to 5), skills wanted (optional), county (required), preferred email for Supabase account creation, TikTok handle (pre-filled if already known), bio/description updates. Responses land in a linked Google Sheet.
- **D-05:** The outreach message template and the Google Form are planning artifacts — produce `docs/outreach-template.md` and a Google Form spec in PLAN.md.

**Admin seed script**

- **D-06:** Script lives at **`scripts/seed-founding-members.mjs`** (same pattern as `scripts/seed-georgia-counties.mjs`). Input is a **hardcoded JS array** at the top of the file — one object per consented founding member. Fill in the array after collecting Google Form responses. No CSV parsing.
- **D-07:** For each founding member, the script calls **`supabase.auth.admin.createUser({ email, email_confirm: true })`** to create a real Supabase auth user with email already confirmed. Uses `SUPABASE_SERVICE_ROLE_KEY` env var.
- **D-08:** After creating the auth user, the script inserts directly into `profiles` with `founding_member = true`, `is_published = true`, and all fields from the consent form. The `founding_member` column already exists in `supabase/migrations/003_profile_tables.sql`.
- **D-09:** After seeding each member, the script sends a **"welcome founding member" email via Resend** using existing Resend API key. From: `hello@barterkin.com`. Subject: "You're a founding member of Georgia Barter 🌿"
- **D-10:** The script is **idempotent** — it skips any email address that already exists in `auth.users` (check via `supabase.auth.admin.getUserByEmail` before creating). Safe to re-run as more consent responses come in.

**Founding member badge UI**

- **Claude's Discretion:** Planner decides badge design — suggested: a small inline chip with a leaf/plant emoji or subtle "Founding Member" label on both profile cards (directory) and the detail page at `/m/[username]`. Keep subtle per SEED-04. Do not make it dominant.

**Path to ≥30 profiles**

- **D-11:** Primary recruiting channel is the **@kerryscountrylife TikTok community** (1,400+ followers). Seed Kerry first, then ask Kerry to post about the platform.
- **D-12:** County spread is actively tracked. Before declaring ≥30: verify ≥2 distinct Georgia counties AND ≥3 distinct categories. Recruiting from neighboring counties (Carroll, Cobb, Cherokee) is encouraged.
- **D-13:** Verify after seeding: `SELECT county_id, category, COUNT(*) FROM profiles WHERE founding_member = true GROUP BY county_id, category`.

**Founder commitment**

- **D-14:** Founder-operator's 14-day first-response commitment documented as **written entry in STATE.md** — added by seed script or manually after launch. Format: "**Founder Commitment:** Ashley (the operator) will personally reply to every contact request received in the first 14 days post-launch. Window opens: [launch date]. Window closes: [launch date + 14 days]."

**PITFALLS checklist**

- **Claude's Discretion:** Planner includes the "Looks Done But Isn't" checklist from `.planning/research/PITFALLS.md` as a verification task. Each item checked off before ≥30 threshold claimed. Failing items fixed before launch.

### Claude's Discretion

- Founding-member badge visual design (chip, emoji, color).
- "Looks Done But Isn't" checklist execution — how to verify each item; planner sequences this as a pre-launch verification wave.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEED-01 | Outreach to all 11 existing `index.html` listings for opt-in consent (message template + tracking) | §Outreach Mechanism; `docs/outreach-template.md` artifact spec (§Outreach Template Pattern); consent-tracking rows in this doc |
| SEED-02 | Consent form captures: migrate existing listing Y/N, updates to skills/bio/county, preferred email, TikTok handle (if applicable) | §Google Form Spec — field list mapped to `profiles` columns |
| SEED-03 | Founding-member profiles seeded in production via admin script (never via public signup flow) | §Admin Seed Script Architecture — `scripts/seed-founding-members.mjs` structure; idempotency pattern; three-step transaction (auth user → profile + skills → welcome email) |
| SEED-04 | `founding_member=true` flag renders a subtle badge on profile + card | §Founding-Member Badge Integration — `components/profile/ProfileCard.tsx` + `components/directory/DirectoryCard.tsx` + query extension to `lib/data/directory.ts` |
| SEED-05 | Reach ≥30 seeded profiles spanning ≥2 counties × ≥3 categories before public launch | §Coverage Verification Query — SQL check + gate condition |
| SEED-06 | Founder-operator personally replies to every contact request received in the first 14 days post-launch (operational requirement, not a feature) | §Founder Commitment — STATE.md entry format and placement |
</phase_requirements>

## Summary

Phase 7 is an **operational + scripting phase**, not a feature build. Three workstreams interlock:

1. **Outreach (manual + form-tracked):** 11 TikTok DMs sent by Ashley personally, each anchored to a Google Form for consent capture. Output is a Google Sheet of consented respondents whose fields match the `profiles` schema.
2. **Admin seed script (`scripts/seed-founding-members.mjs`):** A single idempotent Node ESM script that takes a hardcoded JS array (filled in after collecting responses) and performs a three-step transaction per member: (a) create a Supabase auth user via service-role admin API with `email_confirm: true`, (b) insert a `profiles` row with `founding_member=true, is_published=true` plus its skills_offered/skills_wanted child rows, (c) send a branded "welcome founding member" email via Resend from `hello@barterkin.com`. The script follows the exact pattern already in place at `scripts/seed-georgia-counties.mjs` and the Vitest fixture at `tests/unit/contact-eligibility.test.ts` (which already uses `admin.auth.admin.createUser({ email_confirm: true })`).
3. **UI + verification:** Add a subtle "Founding Member" chip to `ProfileCard.tsx` and `DirectoryCard.tsx` (bound on `profile.founding_member`), run the Pitfall §13 "Looks Done But Isn't" checklist, assert ≥30 profiles × ≥2 counties × ≥3 categories via SQL, record Ashley's 14-day founder commitment in STATE.md.

**Primary recommendation:** Follow `scripts/seed-georgia-counties.mjs`'s service-role-client pattern verbatim. The `founding_member` column, the profile RLS model, and the Resend wiring are already live from Phases 3, 5, and 6 — this phase writes ~300 lines of Node glue plus two small UI diffs. The only non-trivial research finding that the planner MUST internalize is **D-10's assumption that `supabase.auth.admin.getUserByEmail` exists — it does NOT exist as a top-level admin method in `@supabase/supabase-js@2.103.x`**. Use `listUsers()` with in-memory filtering (acceptable at 11–30 users), or query `auth.users` directly via the service-role Supabase client (`from('auth.users').select('id').eq('email', ...)`). See §Common Pitfalls, Pitfall 1.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Outreach tracking | Manual (Google Sheet) | — | Solo-builder scale (11 rows); any in-app tooling is overkill per PROJECT.md "free-tier-first, no admin UI" |
| Consent capture | External (Google Form) | — | Form is free, instant, auto-persists to Sheet, supports required-field validation; no schema churn in Supabase |
| Auth user creation | Node script (service-role) | — | Per D-07. `auth.users` is owned by Supabase Auth service — must go through `supabase.auth.admin.createUser`; cannot be direct SQL INSERT (password_hash, instance_id, aud, role columns not managed app-side) |
| Profile row creation | Node script (service-role) | — | Direct INSERT into `profiles` using service-role bypasses the RLS completeness gate (PROF-12) which requires a logged-in owner. Founding profiles need `is_published=true` without the owner first logging in. |
| Welcome email | Node script → Resend API | — | Same pattern as `scripts/send-mailtest.mjs`. No Edge Function needed for one-off script-driven sends. |
| Founding-member badge | Server component (Next.js App Router) | — | Pure server-render since RLS already filters visibility; no client interactivity needed |
| Coverage verification | SQL query (Supabase Studio or psql) | Node script | One-shot pre-launch gate; SQL is the canonical audit |
| Founder commitment | `.planning/STATE.md` edit | — | Documentation artifact; tracks an operational pledge, not code |
| Pre-launch checklist | Human walkthrough | Playwright smoke (reuse) | Items in PITFALLS §13 are mixed — some already have E2E coverage (Phases 2–5), others are manual DNS/deliverability checks |

## Standard Stack

### Core (already installed — no new deps)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | `^2.103.3` | Service-role admin client (`auth.admin.createUser`, `auth.admin.listUsers`, direct table INSERT) | [VERIFIED: package.json line 29]. Same client used by `scripts/seed-georgia-counties.mjs` and `tests/unit/contact-eligibility.test.ts`. |
| `resend` | `^6.12.0` | Send welcome email from the script | [VERIFIED: package.json line 42]. Same client/API used by `scripts/send-mailtest.mjs` (line 18-27) — direct `fetch` against `api.resend.com/emails` OR the SDK. |
| `dotenv` | implicit via Node `--env-file=.env.local` | Load `SUPABASE_SERVICE_ROLE_KEY` + `RESEND_API_KEY` into the script | [CITED: Node 20 LTS supports `--env-file` flag natively since v20.6]. `scripts/seed-georgia-counties.mjs` does not load env because it only reads a JSON file; the new script needs env loading. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node built-ins (`fs`, `path`, `crypto`) | — | `crypto.randomUUID()` for slug fallback, `fs` not needed (array is inline per D-06) | If needed for username slug collisions. Reuse `lib/utils/slug.ts` logic. |
| `@/lib/utils/slug` | internal | Username slug generation matching Phase 3 convention | [VERIFIED: file exists at `/Users/ashleyakbar/barterkin/lib/utils/slug.ts`]. Must be reused, not re-implemented, so script-seeded usernames follow the same rules as app-signup usernames. |
| `@/lib/database.types` | internal | `Database` type for service-role client → ensures column names match | [VERIFIED: file exists]. Gives the script type-safety on `profiles.owner_id`, `founding_member`, etc. |

### What NOT to install

| Don't install | Why |
|---------------|-----|
| `csv-parse` or any CSV lib | D-06 locks input format to a hardcoded JS array. No file IO. |
| Any Google Sheets API client | Google Form output lives in a Sheet Ashley reads manually; no automation needed at 11–30 rows. |
| A new Edge Function | Script runs locally from Ashley's laptop via `node scripts/seed-founding-members.mjs`. No need for a deployed endpoint. |
| `supabase-cli` for seeding | CLI-driven seeds apply at `supabase db reset` time to dev only. Production seeds go through the service-role client. |

**Installation:** None required — all dependencies already present from Phases 1–6.

**Version verification:**
- `@supabase/supabase-js@2.103.3` — [VERIFIED: package.json]; `admin.createUser` API stable since 2.0, `admin.listUsers` pagination API unchanged [CITED: https://supabase.com/docs/reference/javascript/auth-admin-listusers].
- `resend@6.12.0` — [VERIFIED: package.json]; `resend.emails.send({ from, to, subject, html, text })` is the stable v4+ API [CITED: https://resend.com/docs].

## Architecture Patterns

### System Architecture Diagram

```
                  ┌──────────────────────────┐
                  │ Ashley (operator)        │
                  │ - sends TikTok DMs (x11) │
                  │ - links Google Form      │
                  └────────────┬─────────────┘
                               │
                               ▼
                  ┌──────────────────────────┐
                  │ Google Form              │
                  │ - consent Y/N            │
                  │ - display name, bio      │
                  │ - county (required)      │
                  │ - skills offered/wanted  │
                  │ - preferred email        │
                  │ - TikTok handle          │
                  └────────────┬─────────────┘
                               │ auto-writes
                               ▼
                  ┌──────────────────────────┐
                  │ Google Sheet (Ashley)    │
                  └────────────┬─────────────┘
                               │ manual copy to JS array
                               ▼
        ┌───────────────────────────────────────────────┐
        │ scripts/seed-founding-members.mjs             │
        │  const members = [ { email, display_name,     │
        │    county_id, category_id, skills_offered,    │
        │    skills_wanted, tiktok_handle, bio, ... } ] │
        └──────┬──────────────────────┬─────────────────┘
               │                      │
        per member iteration          │ uses SUPABASE_SERVICE_ROLE_KEY
               │                      │       + RESEND_API_KEY
               ▼                      │
  ┌─────────────────────────┐        │
  │ Step A: idempotency     │        │
  │ listUsers({perPage:1000}│        │
  │ → filter email match    │        │
  │ if exists → SKIP        │        │
  └──────────┬──────────────┘        │
             │ new member             │
             ▼                        │
  ┌─────────────────────────┐        │
  │ Step B: auth.admin.     │        │
  │ createUser({ email,     │        │
  │   email_confirm: true })│        │
  │ → returns user.id       │        │
  └──────────┬──────────────┘        │
             │                        │
             ▼                        │
  ┌─────────────────────────┐        │
  │ Step C: INSERT profile  │        │
  │   owner_id = user.id    │        │
  │   founding_member=true  │        │
  │   is_published=true     │        │
  │   username = slug(name) │        │
  │ + INSERT skills_offered │        │
  │ + INSERT skills_wanted  │        │
  └──────────┬──────────────┘        │
             │                        │
             ▼                        │
  ┌─────────────────────────┐        │
  │ Step D: Resend          │◀───────┘
  │ From: hello@barterkin…  │
  │ "You're a founding      │
  │  member! Claim your     │
  │  account via magic link"│
  └──────────┬──────────────┘
             │
             ▼
  ┌─────────────────────────┐
  │ Supabase prod DB        │
  │  auth.users (+1)        │
  │  profiles (+1)          │
  │  skills_offered (+1..5) │
  │  skills_wanted (0..5)   │
  └─────────────────────────┘

  ┌─────────────────────────┐      ┌──────────────────────────┐
  │ Pre-launch verification │      │ Next.js UI (deployed)    │
  │  - SQL coverage query   │      │  DirectoryCard renders   │
  │  - PITFALLS §13 walk    │      │  "Founding Member" chip  │
  │  - STATE.md commitment  │      │  when profile.founding_  │
  └─────────────────────────┘      │  member === true         │
                                   └──────────────────────────┘
```

### Recommended Project Structure

New artifacts created in this phase:

```
scripts/
└── seed-founding-members.mjs      # NEW — D-06 admin seed script

docs/
├── events.md                      # exists
└── outreach-template.md           # NEW — D-05 DM template spec

components/
├── profile/
│   └── FoundingMemberBadge.tsx    # NEW — small reusable chip
├── directory/
│   └── DirectoryCard.tsx          # EDIT — render badge if profile.founding_member
└── profile/
    └── ProfileCard.tsx            # EDIT — render badge if profile.founding_member

lib/
└── data/
    └── directory.ts               # EDIT — add founding_member to SELECT list

.planning/
└── STATE.md                       # EDIT — add Founder Commitment entry (D-14)
```

### Pattern 1: Service-Role Admin Script (reuse from `scripts/seed-georgia-counties.mjs`)

**What:** An ESM Node script that imports the Supabase JS client configured with the `SUPABASE_SERVICE_ROLE_KEY`, bypasses RLS, and performs admin writes.

**When to use:** Any bulk or privileged data operation that must run from a trusted server context — seeding, one-off migrations, operational maintenance.

**Example (existing pattern):**
```javascript
// Source: scripts/seed-georgia-counties.mjs (verified in-repo)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rows = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../lib/data/georgia-counties.json'), 'utf8'))
// ...produces SQL output
```

**Example (pattern the new script must follow, adapted from `tests/unit/contact-eligibility.test.ts` lines 31–60):**
```javascript
// Source: adapted from tests/unit/contact-eligibility.test.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !SERVICE) { console.error('Missing env'); process.exit(1) }

const admin = createSupabaseClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Step B — create auth user (idempotent; see Pitfall 1 for getUserByEmail caveat)
const { data: userData, error: userErr } = await admin.auth.admin.createUser({
  email,
  email_confirm: true,  // bypass email-verify flow (this IS the verify)
})
if (userErr) throw userErr

// Step C — insert profile
const { data: profile, error: profErr } = await admin
  .from('profiles')
  .insert({
    owner_id: userData.user.id,
    username,
    display_name,
    bio,
    county_id,
    category_id,
    avatar_url,          // nullable — Phase 7 may seed with null and PROF-12 is bypassed via service role
    founding_member: true,
    is_published: true,  // service role bypasses owner=auth.uid() check
    accepting_contact: true,
    tiktok_handle,
  })
  .select('id')
  .single()

// Step C (cont) — insert child skill rows
await admin.from('skills_offered').insert(skills.map((s, i) => ({ profile_id: profile.id, skill_text: s, sort_order: i })))
```

**Launch command (CLI invocation):**
```bash
node --env-file=.env.local scripts/seed-founding-members.mjs
# or: env $(cat .env.local | xargs) node scripts/seed-founding-members.mjs
```

### Pattern 2: Resend Direct-Fetch Send (reuse from `scripts/send-mailtest.mjs`)

**What:** Direct `fetch` against `https://api.resend.com/emails` from a Node script, using the `RESEND_API_KEY`.

**When to use:** Script-driven one-off sends that don't need the full SDK (smaller script surface, no extra dependency resolution).

**Alternative (equivalent):** `resend.emails.send(...)` via the SDK — already installed. Either works. The SDK pattern is slightly cleaner for structured payloads.

**Example:**
```javascript
// Source: scripts/send-mailtest.mjs (verified in-repo)
const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from: "Barterkin <hello@barterkin.com>",
    to: [recipient.email],
    subject: "You're a founding member of Georgia Barter 🌿",
    text: "Your profile is live at barterkin.com/m/{username}. Claim your account any time by entering this email on the login page — we'll send you a magic link.",
    html: "<p>Your profile is live: <a href='https://barterkin.com/m/{username}'>barterkin.com/m/{username}</a></p><p>Claim your account any time by entering <strong>{email}</strong> on the login page — we'll send you a magic link.</p>",
  }),
})
```

**Note on `From`:** `hello@barterkin.com` is the brand-facing Reply-To for member correspondence (D-02). `noreply@barterkin.com` is the transactional auth sender (established in Phase 1/2 per the CLAUDE.md SMTP wiring). For the welcome email, **use `hello@barterkin.com`** per D-09 — it invites replies, which is the point.

### Pattern 3: Idempotency Check Before Create

**What:** Query existing state before any write; skip if already present.

**When to use:** Any script that may be re-run as more data comes in (D-10).

**Example (replacing the assumed `getUserByEmail`):**
```javascript
// Source: adapted — getUserByEmail is NOT a public admin method (see Pitfall 1)
async function emailExists(admin, email) {
  // Option A (RECOMMENDED for 11-30 seeds): list + in-memory filter
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  return data.users.some(u => u.email?.toLowerCase() === email.toLowerCase())
}

// Option B (cheaper at scale): direct auth.users SELECT via service role
// Works because service_role has BYPASSRLS and reads any schema
async function emailExistsViaSql(admin, email) {
  const { data, error } = await admin
    .schema('auth')           // <-- explicit non-public schema
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (error) throw error
  return data != null
}
```

For 11–30 founding members both approaches return instantly. Prefer Option A — it's the documented admin API path.

### Pattern 4: Subtle Badge in Server Component

**What:** A conditional chip rendered when `profile.founding_member === true`, styled to match existing Phase 6 founding-strip cards.

**When to use:** Directory card and profile detail page.

**Existing reference (from `components/landing/FoundingMemberCard.tsx` lines 30–35):**
```tsx
<Badge
  className="absolute right-4 top-4 bg-clay/10 text-clay ring-1 ring-clay/20 font-normal"
  variant="secondary"
>
  Founding member
</Badge>
```

Reuse this exact styling so the landing page, directory card, and profile detail stay visually consistent.

**Where to render:**
- `components/directory/DirectoryCard.tsx` — top-right absolute position (card already has `relative` parent candidate via Card primitive).
- `components/profile/ProfileCard.tsx` — inline next to display name in the `<div className="flex-1 space-y-2">` block (line 50), or adjacent to the 3-dot OverflowMenu (line 51-65).

**Extract into shared component:**
```tsx
// components/profile/FoundingMemberBadge.tsx (NEW)
import { Badge } from '@/components/ui/badge'

export function FoundingMemberBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={`bg-clay/10 text-clay ring-1 ring-clay/20 font-normal ${className ?? ''}`}
    >
      Founding member
    </Badge>
  )
}
```

### Anti-Patterns to Avoid

- **Hand-rolling auth.users inserts via direct SQL:** `auth.users` has managed columns (`encrypted_password`, `instance_id`, `aud`, `role`, `confirmation_token`) that Supabase Auth manages. Always go through `admin.auth.admin.createUser`. Direct INSERT is fragile across Auth-service upgrades.
- **Seeding profiles WITHOUT the auth user:** Would create an orphan profile row whose `owner_id` points at nothing. The foreign key `references auth.users(id) on delete cascade` would reject the INSERT. Enforce: auth user first, profile second.
- **Calling the Next.js server action `saveProfile` from the script:** `saveProfile` requires a logged-in user (`supabase.auth.getUser()` check) and runs the PROF-12 completeness gate. Service-role bypass is the correct path; don't try to simulate a user session.
- **Adding the founding badge to `search_vector`:** The FTS search column (migration 003 line 237–243) only includes display_name + bio + tiktok_handle. Do NOT extend search_vector for the badge — it's a visual-only concept. Adding it would bloat the index and allow "founding member" keyword to match every founder regardless of the actual search intent.
- **Creating an Edge Function for the welcome email:** Over-engineered. Run the Resend call inline in the script. Failure of one email shouldn't block subsequent seeds — catch and log, continue the loop.
- **Writing any admin UI:** PROJECT.md hard constraint: no admin UI at MVP. Trust/ban via SQL; seeding via script.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email address lookup | Custom SQL query against auth schema on every iteration | `admin.auth.admin.listUsers({ page: 1, perPage: 1000 })` then in-memory filter | At 11–30 rows, one list call costs less than N SELECTs. Plus listUsers is the documented public API — more stable across Supabase upgrades. |
| Slug uniqueness | Reinvent per-script slug resolver | Reuse `@/lib/utils/slug.ts` + a script-local uniqueness check that retries with `-N` suffix (mirrors `lib/actions/profile.ts` lines 42–70) | Phase 3's `resolveUniqueSlug` pattern is battle-tested; duplicating risks slug-collision bugs. |
| Google Sheet → JS array conversion | CSV parser or Sheets API integration | Manual copy-paste into the hardcoded array at top of `scripts/seed-founding-members.mjs` (D-06) | 11 rows. Manual is faster than plumbing. |
| Email templating | MJML, custom HTML builder | Inline HTML + text strings in the script (like `scripts/send-mailtest.mjs` does) OR a `react-email` template if we want on-brand polish | `react-email` already installed for Phase 5 — if the planner wants brand-consistency, reuse; otherwise inline HTML is fine for an internal welcome email. |
| Outreach tracking database | Custom table in Supabase | Google Form → Google Sheet (D-01) | Zero code, zero schema churn, free, auto-timestamped. |
| PITFALLS §13 verification automation | Write Playwright scripts for every checklist item | Walk through manually; reuse existing E2E tests where they apply (many items in the checklist are already covered by Phase 2–5 E2E specs) | The checklist is a human audit gate, not a test suite. Manual walkthrough is the canonical "pre-launch sign-off" ritual. |

**Key insight:** The value this phase adds is **operational rigor**, not code. The `founding_member` column, the RLS model, the directory card, the profile card, the Resend wiring, and the service-role admin client all already exist. The only new code is `scripts/seed-founding-members.mjs` (~200 lines) and a small badge component + two prop plumbing edits.

## Common Pitfalls

### Pitfall 1: `supabase.auth.admin.getUserByEmail` DOES NOT EXIST

**What goes wrong:** CONTEXT.md D-10 says: "check via `supabase.auth.admin.getUserByEmail` before creating." The planner writes `await admin.auth.admin.getUserByEmail(email)`. TypeScript compiles (because `auth.admin` has loose typing in some versions). At runtime the call returns `undefined` or throws — depending on client version — and the idempotency check silently fails. Every re-run creates duplicate auth users; `profiles.owner_id` unique constraint then blocks the profile insert on the second run, leaving orphan `auth.users` rows.

**Why it happens:** Multiple community requests over years for this helper; it was never shipped. The closest admin methods are `getUserById(uuid)` and `listUsers({ page, perPage })` [CITED: https://supabase.com/docs/reference/javascript/auth-admin-listusers, https://github.com/supabase/auth/issues/880]. The Supabase Flutter/Dart SDK does have `getUserByEmail`, which causes JS developers to assume the JS client has parity — it doesn't.

**How to avoid:**
- Use `admin.auth.admin.listUsers({ page: 1, perPage: 1000 })` and filter by email in JS (see Pattern 3 Option A above).
- OR use service-role SQL access: `admin.schema('auth').from('users').select('id').eq('email', email).maybeSingle()` (Option B). Service role has `BYPASSRLS` and can read the `auth` schema directly [CITED: https://supabase.com/docs/guides/database/postgres/roles].
- After implementation, add a smoke test to `tests/unit/` that runs the script in dry-run mode against a test Supabase project and asserts re-running doesn't create duplicates.

**Warning signs:**
- Script works the first time, silently creates duplicate auth users on re-run.
- `profiles.owner_id UNIQUE` constraint violation on second run with the same email list.
- Orphan `auth.users` rows with `email_confirmed_at` set but no corresponding `profiles` row.

**CRITICAL:** This is the single most important correction the planner must make. CONTEXT.md D-10 assumes an API that does not exist. Treat D-10's intent ("idempotency — skip existing emails") as locked; the implementation detail (`getUserByEmail`) must be replaced with `listUsers` or schema-SQL. Flag this to the user in the first plan-check.

### Pitfall 2: Service role bypasses PROF-12 completeness gate — malformed profiles ship

**What goes wrong:** The migration-003 RLS policy "Owners update own profile, publish only when complete" enforces `is_published=true` requires `display_name AND county_id AND category_id AND avatar_url AND ≥1 skill_offered`. Service-role INSERTs bypass RLS entirely. Script seeds a profile with `is_published=true, avatar_url=null` or `skills_offered=[]`. The profile appears in directory with a blank avatar and no skills. Looks broken.

**Why it happens:** The planner focuses on mapping consent-form fields to DB columns and forgets that the RLS gate no longer runs for service-role writes.

**How to avoid:**
- Add an assertion in the script: before the INSERT, validate every row in the `members` array has `display_name`, `county_id`, `category_id`, at least one `skills_offered`, and either `avatar_url` set OR a placeholder image URL (e.g., a pre-uploaded default founder-avatar in `public/`).
- For the 11 legacy TikTok listings: **do NOT use TikTok-scraped profile photos** (licensing / consent). Either (a) ask the member to supply a photo in the Google Form, (b) upload manually to Supabase Storage before running the script with the URL, or (c) accept avatar-less founders with a default sage-palette initial-letter tile and confirm with the user that SEED-04's "subtle badge" is sufficient substitute for visual polish.
- If avatar is nullable at seed time: check that the existing `DirectoryCard.tsx` fallback (`AvatarFallback` with initial letter) renders cleanly — it already does (line 31).

**Warning signs:**
- After seeding, `SELECT count(*) FROM profiles WHERE founding_member=true AND (avatar_url IS NULL OR category_id IS NULL)` returns > 0.
- Directory page shows cards with broken avatars or missing categories.

### Pitfall 3: Username slug collisions between script-seeded and user-signup profiles

**What goes wrong:** Seed script runs, creates `username='kerry-country-life'`. Later, a different Kerry signs up from the signup flow and Phase 3's `resolveUniqueSlug` happens to suggest the same base `kerry`. First candidate (`kerry`) is free — collides with a totally unrelated member. Worse: if the seeded username happens to match the new signer's base slug, the slug resolver retries to `kerry-2` and a sibling is born.

**Why it happens:** Slug space is shared between service-role seeds and user-signup flow; neither knows about the other.

**How to avoid:**
- Reuse `lib/utils/slug.ts` → `generateSlug(display_name)` in the seed script (IMPORT, don't duplicate).
- Implement a script-side retry loop mirroring `lib/actions/profile.ts` lines 44–70 (`resolveUniqueSlug`): try `slug`, `slug-2`...`slug-9`, then `slug-<uuid-first-8>`.
- Treat seeded usernames as locked once set (same convention as Phase 3, D-07). Document the locked slugs in a comment in the script so future re-runs don't try to re-generate.

**Warning signs:**
- `select username, count(*) from profiles group by username having count(*) > 1` returns rows.
- Seeding log shows slug collisions on re-run.

### Pitfall 4: Landing page "founding strip" double-counts seeded members

**What goes wrong:** Phase 6's `lib/data/landing.ts` → `getFoundingMembers()` already queries `founding_member=true AND is_published=true AND banned=false` and shows up to 6 on the landing strip. After Phase 7 seeds 15 founders, the landing strip shows the newest 6 — exactly what we want. No bug. BUT: if the badge UI accidentally duplicates in the strip (existing strip card already shows "Founding member" chip) and then adds another one after landing re-render, or the badge is hard-coded in `FoundingMemberCard.tsx` regardless of the flag, you get visual duplication.

**Why it happens:** `FoundingMemberCard.tsx` hard-codes the "Founding member" badge (line 30–35) because its query already filters to `founding_member=true`. The new `DirectoryCard.tsx` badge fires off `profile.founding_member`. Both are correct — just don't accidentally unify the two cards into one.

**How to avoid:**
- Keep the two cards independent (landing card = always-founder by query contract; directory card = conditional on the flag).
- Verify on E2E: load landing page, load directory page, compare — same member should show the badge in both with identical styling (reuse the new `FoundingMemberBadge` component in both).

**Warning signs:**
- Landing strip renders badge twice on each card.
- Directory card missing the badge for profiles that show it on the landing page.

### Pitfall 5: Welcome email hits Resend free-tier limits mid-seed

**What goes wrong:** Resend free tier is **100 emails/day** [CITED: CLAUDE.md §Resend]. At 30 seeded members sent back-to-back, we're under the limit. But if Ashley also runs the deliverability test (`scripts/send-mailtest.mjs`) on the same day AND the auth system has been sending magic-link emails during Phase 2 testing, total daily count can creep up. Hitting the cap mid-loop leaves N members "seeded but not welcomed."

**Why it happens:** Running the script without checking the Resend dashboard counter.

**How to avoid:**
- Before running the seed script, check the Resend dashboard's daily send count.
- Run the script in batches of 10 per day if close to cap, OR upgrade to Resend paid tier ($20/mo) if launch timing demands same-day seeding of all 30.
- The script MUST catch per-member email failures and continue the loop. Log failed sends to stderr so Ashley can re-send manually.
- Welcome email is NICE-TO-HAVE, not blocking. The profile appears in the directory immediately after the INSERT succeeds — the email is just a courtesy claim-nudge.

**Warning signs:**
- Resend API returns `429 Too Many Requests` on welcome email send.
- Resend dashboard shows `100/100` daily cap reached.

### Pitfall 6: Pre-launch checklist items missed because "someone already did that in Phase X"

**What goes wrong:** The PITFALLS §13 "Looks Done But Isn't" checklist has 23 items. Many are addressed in earlier phases (Phase 2 auth, Phase 3 RLS, Phase 5 relay). The planner (or Ashley) assumes "we tested this in Phase 2, skip" — but time has passed, merges have happened, prod DNS has been touched. Item silently broken.

**Why it happens:** Phase 7 runs against LIVE PRODUCTION. Every item in the checklist must be re-verified against the prod environment specifically.

**How to avoid:**
- Treat the checklist as a pre-launch re-verification, not a trust exercise. Run each item against the prod URL / prod Supabase project.
- Auto-checks that can be automated (SQL queries, Playwright smoke tests against prod) should be; manual checks (DNS resolve, mail-tester score) go in a written runbook.
- Record the run: create `.planning/phases/07-pre-launch-seeding/07-PRELAUNCH-CHECKLIST.md` with each item as a checkbox + evidence link (screenshot, SQL result, mail-tester URL).

**Warning signs:**
- Checklist items marked "done" with no linked evidence.
- mail-tester.com score slipped below 9/10 but nobody re-tested before launch.
- Middleware `getUser()` pattern regressed in a Phase 6 refactor.

### Pitfall 7: Founding-member badge makes ALL members look "founding" post-launch

**What goes wrong:** The `founding_member` column defaults to `false` in the schema. Post-launch, normal signups have `founding_member=false` and don't get the badge — correct. But if somebody forgets and runs the script in non-pre-launch mode (e.g., 3 months after launch), new "founders" appear. This dilutes the SEED-04 concept.

**Why it happens:** No guard in the script against accidental post-launch execution.

**How to avoid:**
- Add a `CUTOFF_DATE` constant at the top of the script: if `new Date() > CUTOFF_DATE`, require a `--force` CLI flag to proceed.
- Document in `docs/outreach-template.md` that the "founding member" offer is strictly pre-launch; post-launch members receive the standard signup flow with no badge.

**Warning signs:**
- `SELECT min(created_at), max(created_at) FROM profiles WHERE founding_member=true` shows a created_at beyond the launch date.

## Runtime State Inventory

Phase 7 is **additive data seeding**, not a rename/refactor. The only "runtime state" concerns are new-state creation, not migration of existing state:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | New: `auth.users` rows (≤30), `profiles` rows (≤30), `skills_offered`/`skills_wanted` child rows. No existing data to migrate — `founding_member` defaults to false and there are no live users yet. | Seed via `scripts/seed-founding-members.mjs` only. |
| Live service config | Resend domain (`barterkin.com`) must be verified before sending welcome emails from `hello@barterkin.com`. Must be live from Phase 1 — re-verify via `dig` at phase start. | Confirm Resend dashboard shows `barterkin.com` as verified. If `hello@` is not yet configured (only `noreply@` was set up in Phase 1/2), add it in Resend Studio before outreach begins. |
| OS-registered state | None — no systemd units, cron jobs, or Task Scheduler entries introduced by this phase. | None. |
| Secrets/env vars | New usage: `RESEND_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` for Ashley's laptop (already required for Phase 1/5; re-confirm). No new secret keys. | Verify `.env.local` has both. Script should fail fast if either is missing (pattern from `scripts/send-mailtest.mjs` line 15–16). |
| Build artifacts | None — script runs locally, no build output. Next.js bundle only changes if the badge component is added (rebuild + redeploy to Vercel via standard CI). | Standard Vercel deploy for badge UI changes. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node 20 LTS | Running `scripts/seed-founding-members.mjs` | ✓ (expected — used in Phase 1+) | ≥20.0.0 | — |
| `--env-file` flag | Loading `.env.local` into script | ✓ (Node 20.6+) | — | `export $(cat .env.local \| xargs)` as shell fallback |
| `SUPABASE_SERVICE_ROLE_KEY` env var | Admin writes | ✓ (in `.env.local` from Phase 1) | — | Script exits with clear error if missing |
| `RESEND_API_KEY` env var | Welcome email sends | ✓ (in `.env.local` from Phase 1) | — | Script exits with clear error; Ashley can run without and send welcome emails manually |
| Resend domain `barterkin.com` verified | `From: hello@barterkin.com` | ✓ (from Phase 1 SMTP setup) | — | If only `noreply@` is verified, either add `hello@` alias in Resend or use `noreply@` with a friendly display name |
| `hello@barterkin.com` mailbox receiving replies | Per D-02, members may email directly | Unknown — verify with Ashley | — | Without an inbox, Ashley cannot receive replies. BLOCKING: confirm Google Workspace / forwarding / Namecheap mail is configured before outreach. |
| Google Form + Google Sheet | Consent capture (D-04) | Not created yet | — | Planner produces the Google Form spec; Ashley creates it before outreach starts (manual setup task in PLAN.md). |
| TikTok account / DM access | Outreach channel (D-01) | Ashley's personal TikTok | — | — |
| PostHog live | Tracking `contact_initiated` post-launch | ✓ (Phase 1) | — | — |

**Missing dependencies with no fallback:**
- `hello@barterkin.com` mailbox availability — must be confirmed BEFORE outreach (otherwise members replying to DMs via email hit a black hole).
- Google Form itself — planning artifact; Ashley creates before outreach.

**Missing dependencies with fallback:**
- Node `--env-file` (fallback: `xargs` shell pattern).

## Common Pitfalls (cross-reference to .planning/research/PITFALLS.md §13 "Looks Done But Isn't")

The checklist that Phase 7 must walk through. Many items were verified during earlier phases but need a **final pre-launch re-verification against production**:

| # | Item | Verification Method | Where Already Addressed |
|---|------|---------------------|-------------------------|
| 1 | `getUser()` (not `getSession()`) on every server route | `grep -r "getSession\(" app/` returns zero | Phase 2 middleware |
| 2 | Middleware logs out after 1+ hour idle | Playwright sleep test | Phase 2 |
| 3 | Every table has SELECT/INSERT/UPDATE/DELETE policies | `pg_policies` query | Phase 2/3/5 migrations |
| 4 | Views have `security_invoker = true` | `\d+ <view>` | No views in this project — skip |
| 5 | Supabase Advisor shows zero red lints | Supabase Dashboard visual | Manual audit |
| 6 | Anon role cannot SELECT unauthorized rows | SQL test as anon | `tests/unit/directory-rls-visibility.test.ts` |
| 7 | `grep -r service_role .next/static` empty | Post-build grep | `import 'server-only'` enforced in `lib/supabase/admin.ts` |
| 8 | Avatar path traversal rejected | Manual upload test | Phase 3 storage policy |
| 9 | Bucket `file_size_limit` + `allowed_mime_types` set | Supabase Dashboard | Phase 3 (migration 003_profile_storage.sql) |
| 10 | Pages calling `getUser()` have `dynamic = 'force-dynamic'` | `grep` check | Phase 3 `/m/[username]/page.tsx` line 15 |
| 11 | SPF/DKIM/DMARC pass | `dig` + mail-tester.com ≥9/10 | Phase 1 — **re-verify against prod DNS in Phase 7** |
| 12 | Apple Communication Email Service registered | Apple Developer portal | **Not applicable — project does NOT use Apple Sign In (deferred to Capacitor milestone per PROJECT.md)**. Skip with note. |
| 13 | Contact Reply-To server-assigned, not body-derived | Code inspection | Phase 5 Edge Function |
| 14 | Same sender → same recipient blocked after 1 msg/24h | `curl` × 2 | Phase 5 |
| 15 | Sender hits 5/24h total cap | Scripted test | Phase 5 |
| 16 | Blocked sender cannot send to blocker | E2E | Phase 5 |
| 17 | Report creates row + emails admin | E2E | Phase 5 |
| 18 | "Contact button pressed" PostHog event fires | Test click + PostHog dashboard | Phase 5 |
| 19 | Directory first paint shows ≥20 profiles OR category/county chooser | Visual check | **Phase 7 requirement — SEED-05 exactly addresses this** |
| 20 | ToS + Privacy at `/terms` + `/privacy`, linked from footer | Visual check | Phase 2 (note: routes are `/legal/tos` and `/legal/privacy`; reconcile with checklist wording) |
| 21 | Signup requires county selection | Manual flow | Phase 3 |
| 22 | Profile hidden until `email_confirmed_at IS NOT NULL` | SQL filter | Phase 3 RLS |
| 23 | Manifest valid; icons exist; Lighthouse PWA ≥90 | Lighthouse run | Phase 6 |

**Items specific to Phase 7 (new):**

- [ ] SEED-05 gate satisfied: `SELECT COUNT(*) FROM profiles WHERE founding_member=true AND is_published=true AND banned=false` ≥ 30.
- [ ] `SELECT COUNT(DISTINCT county_id) FROM profiles WHERE founding_member=true AND is_published=true` ≥ 2.
- [ ] `SELECT COUNT(DISTINCT category_id) FROM profiles WHERE founding_member=true AND is_published=true` ≥ 3.
- [ ] Founding-member badge renders on `/directory` card + `/m/[username]` page for `founding_member=true` profiles.
- [ ] Founding-member badge does NOT render for `founding_member=false` profiles (test against a fresh signup).
- [ ] STATE.md contains the D-14 Founder Commitment block with explicit launch date.
- [ ] Google Form URL live and tested with a sample submission.
- [ ] `docs/outreach-template.md` reviewed and approved by Ashley.
- [ ] All 11 TikTok DMs sent and responses (Y/N) captured in the Sheet.
- [ ] Welcome email deliverability spot-check: send to Ashley's inbox first, verify formatting + from-address + reply-target.

## Code Examples

### Example 1: Full shape of `scripts/seed-founding-members.mjs`

```javascript
// Source: composed from scripts/seed-georgia-counties.mjs + scripts/send-mailtest.mjs
// + tests/unit/contact-eligibility.test.ts patterns
#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { generateSlug } from '../lib/utils/slug.js' // or .mjs as appropriate

// -------- Guardrails --------
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND = process.env.RESEND_API_KEY
if (!URL || !SERVICE) { console.error('Missing SUPABASE env'); process.exit(1) }
if (!RESEND) console.warn('RESEND_API_KEY missing — welcome emails will be skipped')

const CUTOFF_DATE = new Date('2026-06-01') // Pitfall 7 — require --force past this
if (new Date() > CUTOFF_DATE && !process.argv.includes('--force')) {
  console.error(`Past pre-launch cutoff (${CUTOFF_DATE.toISOString()}). Use --force to override.`)
  process.exit(1)
}

// -------- Data (D-06: hardcoded array; fill after collecting Google Form responses) --------
const members = [
  {
    email: 'kerry@example.com',
    display_name: "Kerry's Country Life",
    bio: 'Herbal syrups, tinctures, and country living knowledge. Growing community one trade at a time.',
    county_id: 13223, // Paulding County (Dallas)
    category_id: 9,   // Outdoors & Animals (closest to "agriculture")
    avatar_url: null, // or pre-uploaded URL
    skills_offered: ['Herbal syrups', 'Tinctures', 'Homesteading advice'],
    skills_wanted: [],
    tiktok_handle: '@kerryscountrylife',
    availability: null,
    accepting_contact: true,
  },
  // ...10 more consenting founders
]

// -------- Clients --------
const admin = createClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// -------- Helpers --------
async function emailExists(email) {
  // Pitfall 1: getUserByEmail does not exist. Use listUsers + filter.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  return data.users.some(u => u.email?.toLowerCase() === email.toLowerCase())
}

async function resolveUniqueUsername(base) {
  // Mirror lib/actions/profile.ts:resolveUniqueSlug
  const candidates = [base, ...Array.from({ length: 8 }, (_, i) => `${base}-${i + 2}`),
                     `${base}-${crypto.randomUUID().slice(0, 8)}`]
  for (const c of candidates) {
    const { count } = await admin.from('profiles').select('id', { head: true, count: 'exact' }).eq('username', c)
    if ((count ?? 0) === 0) return c
  }
  return candidates.at(-1)
}

async function sendWelcomeEmail(email, displayName, username) {
  if (!RESEND) return { skipped: true }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Barterkin <hello@barterkin.com>',
      to: [email],
      subject: "You're a founding member of Georgia Barter 🌿",
      text: `Hi ${displayName},\n\nYour Georgia Barter profile is live: https://barterkin.com/m/${username}\n\nClaim your account any time — go to https://barterkin.com/login, enter ${email}, and you'll get a magic link. From there you can edit your profile, respond to contacts, and change anything we got wrong.\n\nThanks for trusting us with your listing.\n\n— Ashley\nBarterkin`,
      html: `<p>Hi ${displayName},</p><p>Your Georgia Barter profile is live: <a href="https://barterkin.com/m/${username}">barterkin.com/m/${username}</a></p><p>Claim your account any time — go to <a href="https://barterkin.com/login">barterkin.com/login</a>, enter <strong>${email}</strong>, and you'll get a magic link. From there you can edit your profile, respond to contacts, and change anything we got wrong.</p><p>Thanks for trusting us with your listing.</p><p>— Ashley<br/>Barterkin</p>`,
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { ok: false, status: res.status, body }
  }
  return { ok: true }
}

// -------- Main loop --------
const summary = { seeded: 0, skipped: 0, emailFailed: 0, errors: [] }

for (const m of members) {
  try {
    if (await emailExists(m.email)) {
      console.log(`⊝ skip ${m.email} — already exists`)
      summary.skipped += 1
      continue
    }

    // Step B: auth user
    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email: m.email,
      email_confirm: true,
    })
    if (userErr) throw userErr

    // Step C: profile + skills
    const username = await resolveUniqueUsername(generateSlug(m.display_name))
    const { data: profile, error: profErr } = await admin.from('profiles').insert({
      owner_id: userData.user.id,
      username,
      display_name: m.display_name,
      bio: m.bio,
      county_id: m.county_id,
      category_id: m.category_id,
      avatar_url: m.avatar_url,
      availability: m.availability,
      accepting_contact: m.accepting_contact,
      tiktok_handle: m.tiktok_handle,
      founding_member: true,
      is_published: true,
      banned: false,
    }).select('id').single()
    if (profErr) throw profErr

    if (m.skills_offered?.length) {
      await admin.from('skills_offered').insert(
        m.skills_offered.map((s, i) => ({ profile_id: profile.id, skill_text: s, sort_order: i }))
      )
    }
    if (m.skills_wanted?.length) {
      await admin.from('skills_wanted').insert(
        m.skills_wanted.map((s, i) => ({ profile_id: profile.id, skill_text: s, sort_order: i }))
      )
    }

    // Step D: welcome email (non-blocking)
    const mail = await sendWelcomeEmail(m.email, m.display_name, username)
    if (mail.ok) console.log(`✓ seeded ${m.email} (${username}) + welcome sent`)
    else {
      console.warn(`⚠ seeded ${m.email} (${username}) but email failed:`, mail.status ?? 'skipped', mail.body)
      summary.emailFailed += 1
    }
    summary.seeded += 1
  } catch (err) {
    console.error(`✗ ${m.email} failed:`, err.message ?? err)
    summary.errors.push({ email: m.email, error: String(err) })
  }
}

// -------- Coverage report (D-13, SEED-05) --------
const { data: spread } = await admin.from('profiles')
  .select('county_id, category_id, count:id.count()', { count: 'exact' })
  .eq('founding_member', true)
  .eq('is_published', true)
  .eq('banned', false)
// OR simpler: run the raw SQL and log it
console.log('\n=== Summary ===')
console.log(JSON.stringify(summary, null, 2))
console.log('\n=== Coverage ===')
const { count: total } = await admin.from('profiles').select('id', { head: true, count: 'exact' })
  .eq('founding_member', true).eq('is_published', true).eq('banned', false)
const { data: counties } = await admin.from('profiles').select('county_id')
  .eq('founding_member', true).eq('is_published', true).eq('banned', false)
const { data: categories } = await admin.from('profiles').select('category_id')
  .eq('founding_member', true).eq('is_published', true).eq('banned', false)
const distinctCounties = new Set(counties?.map(r => r.county_id)).size
const distinctCategories = new Set(categories?.map(r => r.category_id)).size
console.log(`Total founding members published: ${total}`)
console.log(`Distinct counties: ${distinctCounties} (gate: ≥2)`)
console.log(`Distinct categories: ${distinctCategories} (gate: ≥3)`)
if ((total ?? 0) < 30) console.warn('⚠ SEED-05 not yet satisfied (need ≥30)')
```

### Example 2: Founding-member badge plug-in to `DirectoryCard.tsx`

```tsx
// Source: proposed edit to components/directory/DirectoryCard.tsx (verified against existing file)
import { FoundingMemberBadge } from '@/components/profile/FoundingMemberBadge'

// Inside the <Card> (which is position: relative by default for shadcn Card):
<Card className="relative bg-sage-pale ...">
  {profile.founding_member && (
    <FoundingMemberBadge className="absolute right-4 top-4" />
  )}
  {/* ...existing avatar + content */}
</Card>
```

Plus a small type extension:
```tsx
// lib/data/directory.types.ts — add to DirectoryProfile
export interface DirectoryProfile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  founding_member: boolean   // NEW
  counties: { name: string } | null
  categories: { name: string } | null
  skills_offered: DirectorySkill[]
}
```

And a one-line update in `lib/data/directory.ts` `buildRows()` SELECT list to include `founding_member`.

### Example 3: STATE.md Founder Commitment entry (D-14)

```markdown
## Founder Commitment (SEED-06)

**Founder:** Ashley (solo operator)
**Commitment:** I will personally reply to every contact request received in the first
14 days post-launch.
**Launch date:** YYYY-MM-DD  <!-- fill at launch -->
**Commitment window closes:** YYYY-MM-DD  <!-- launch + 14 days -->
**Tracking:** PostHog `contact_initiated` event count vs manual reply log in STATE.md

_First recorded: 2026-04-XX by Phase 7._
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `supabase.auth.admin.getUserByEmail` (never shipped) | `admin.auth.admin.listUsers({ page, perPage })` + in-memory filter | N/A — was never in the JS SDK | Planner MUST use listUsers or direct `auth` schema SQL |
| Seeding via direct `INSERT INTO auth.users` SQL | `admin.auth.admin.createUser({ email, email_confirm: true })` | Supabase Auth v2 (2023+) | Direct INSERT is fragile — managed columns change; admin API is stable |
| CSV-driven imports | Hardcoded JS array (per D-06) | Project preference | No extra dependency; trivial at 30-row scale |
| Separate transactional + brand email senders | `hello@barterkin.com` (interactive) + `noreply@barterkin.com` (auth) | Phase 1 deliverability setup | Reply-to distinction matters for member-initiated replies |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs` — deprecated in favor of `@supabase/ssr`. Not used in this project (PITFALL §3 already addressed in Phase 1/2). No Phase 7 action.

## Assumptions Log

> Claims in this research tagged `[ASSUMED]` — need user confirmation before planning proceeds.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `hello@barterkin.com` is a real monitored inbox (not just a Resend sender) | §Environment Availability | If not, members replying via email per D-02 hit a black hole; must create a Google Workspace alias or email-forwarding rule before outreach. |
| A2 | Resend `From: hello@barterkin.com` is verified (or at least an alias of the verified `barterkin.com` domain) | §Environment Availability | If only `noreply@` is explicitly configured, the welcome email send may fail SPF checks or be rejected by Resend. Must verify in Resend Studio before running the script. |
| A3 | The 11 legacy TikTok listings' descriptions and handles in `legacy/index.html` are still current | §Specifics | Some handles may have changed or accounts may be inactive. Verify each handle opens a valid TikTok profile before DMing. |
| A4 | The 10 `categories` in the DB can accommodate the 6 legacy-listing categories (food, services, crafts, agriculture, beauty, wellness) | §Examples | Mapping: food→Food & Kitchen (2), services→Trades & Repair (8), crafts→Arts & Crafts (3), agriculture→Outdoors & Animals (9), beauty→Wellness & Bodywork (6) or a new category?, wellness→Wellness & Bodywork (6). Confirm with user that these mappings are acceptable during consent. |
| A5 | Launch date is within 30 days of Phase 7 start | §Pitfall 7 (CUTOFF_DATE) | If launch slips, the CUTOFF_DATE needs extending; otherwise `--force` flag is hit regularly. |
| A6 | Resend free-tier quota (100/day) is sufficient — i.e., Ashley won't send 30 welcomes on a day with heavy other-traffic | §Pitfall 5 | If rate-limited, welcome emails are deferred (profile still seeded — not blocking). |

## Open Questions

1. **How are the 11 listings' avatars acquired?**
   - What we know: `legacy/index.html` does not include photos; TikTok profile pics exist but may be licensed/copyrighted.
   - What's unclear: Whether Ashley will ask each member to supply a photo in the consent form, accept avatar-less founders with an initial-letter fallback tile, or use a pre-designed sage-palette default avatar.
   - Recommendation: Add an optional photo-upload field in the Google Form (drive-link to an image); if absent, use a default "founding member" avatar uploaded once to `public/` and referenced by URL in the script. The existing `AvatarFallback` (initial letter) is acceptable, but a uniform visual for founders might strengthen the brand strip on landing.

2. **Should the welcome email use `react-email` (for brand consistency with Phase 5 contact-relay templates) or plain HTML (simpler, matches `scripts/send-mailtest.mjs`)?**
   - What we know: `react-email` is already a dependency; Phase 5 uses it for relay + admin-notify templates. Plain HTML via `fetch` works and is lighter.
   - What's unclear: The user's brand-polish expectation for the one-time welcome email.
   - Recommendation: Inline HTML for MVP speed. If the welcome email ends up being the first member-facing transactional touch besides auth emails, the planner can upgrade to a `react-email` template in a follow-up task. Not blocking.

3. **What if a consent form respondent declines (Y/N = N)?**
   - What we know: The 11 existing listings are already live on `legacy/index.html`. Declining consent for the new platform doesn't auto-remove them from the legacy site.
   - What's unclear: Does "no" mean (a) don't migrate but keep them on `legacy/index.html` until we retire it in Phase 6, or (b) pull them from `legacy/index.html` immediately out of respect?
   - Recommendation: Per PROJECT.md, `legacy/index.html` is retired in Phase 6 (landing page polish) and at latest when v1 launches. "No" respondents are simply not seeded — they naturally disappear when the Netlify site goes down. Document this explicitly in the Google Form consent copy so the respondent understands.

4. **Where does the "claim your account" flow live?**
   - What we know: The welcome email says "enter your email on the login page — we'll send you a magic link." Phase 2 shipped magic-link login at `/login`.
   - What's unclear: Does the existing `/login` flow correctly hydrate the seeded user's session — specifically, does `auth.users.email_confirmed_at` being pre-set (via `email_confirm: true`) allow immediate magic-link sign-in without a separate "verify" step?
   - Recommendation: Smoke-test one seeded member end-to-end: sign in via magic link → land on `/profile` or `/profile/edit` → confirm full profile ownership works. If not, debug and document as a Phase 7 verification task.

5. **How does the Google Form URL get into 11 DMs — single shared URL with hidden per-recipient tracking, or 11 unique URLs for attribution?**
   - What we know: D-04 says one form, responses in one Sheet.
   - What's unclear: Whether pre-filling the TikTok handle via URL query param (so the form already shows "@kerryscountrylife" for Kerry's link) is desired.
   - Recommendation: Single Form URL with TikTok handle field pre-filled via `?entry.XXXX=@handle` query param. Low effort; higher fidelity tracking. Spec this in `docs/outreach-template.md`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x + Playwright 1.x (existing) |
| Config file | `vitest.config.ts`, `playwright.config.ts` (existing) |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test && pnpm e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEED-01 | Outreach template exists and is approved | manual-only | N/A — artifact review | ❌ `docs/outreach-template.md` — Wave 0 |
| SEED-02 | Google Form captures required fields | manual-only | N/A — form spec review | ❌ Wave 0 (spec in PLAN.md) |
| SEED-03 | Seed script seeds N members idempotently | integration (manual run with test DB, OR Vitest unit) | `pnpm vitest run tests/unit/seed-founding-members.test.ts` | ❌ Wave 0 — `tests/unit/seed-founding-members.test.ts` |
| SEED-03 | Seed script is idempotent on re-run | unit | `pnpm vitest run tests/unit/seed-founding-members.test.ts -t idempotent` | ❌ Wave 0 |
| SEED-04 | DirectoryCard renders badge when founding_member=true | E2E | `pnpm playwright test tests/e2e/founding-badge.spec.ts` | ❌ Wave 0 — `tests/e2e/founding-badge.spec.ts` |
| SEED-04 | ProfileCard renders badge when founding_member=true | E2E | `pnpm playwright test tests/e2e/founding-badge.spec.ts -t "detail page"` | ❌ Wave 0 |
| SEED-05 | ≥30 profiles, ≥2 counties, ≥3 categories | SQL assertion (manual or scripted) | `psql -f scripts/sql/seed-coverage.sql` OR script's final console output | ❌ Wave 0 — either inline in script (preferred, D-13) or as a separate SQL file |
| SEED-06 | STATE.md contains Founder Commitment | artifact-review | `grep -c "Founder Commitment" .planning/STATE.md` ≥ 1 | — direct file check |

### Sampling Rate
- **Per task commit:** `pnpm test` (fast Vitest unit suite — should complete < 30s)
- **Per wave merge:** `pnpm test && pnpm e2e` (full Playwright run)
- **Phase gate:** Full suite green + script dry-run against staging Supabase + SQL coverage gate satisfied against prod before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `docs/outreach-template.md` — D-05 artifact, outreach template approved by Ashley
- [ ] `scripts/seed-founding-members.mjs` — the script itself (shell with hardcoded empty array; data filled as responses arrive)
- [ ] `components/profile/FoundingMemberBadge.tsx` — shared component
- [ ] `tests/unit/seed-founding-members.test.ts` — idempotency + happy-path against test Supabase project (gated on env vars)
- [ ] `tests/e2e/founding-badge.spec.ts` — renders on directory card + detail page only when flag is true
- [ ] Google Form URL + Google Sheet — manual setup, linked from `docs/outreach-template.md`

## Project Constraints (from CLAUDE.md)

| Constraint | Applies to Phase 7 | Enforcement |
|------------|-------------------|-------------|
| No custom auth code — Supabase Auth only | YES | Script uses `admin.auth.admin.createUser`; no manual `auth.users` INSERT |
| Member email/phone never exposed in directory UI | YES | `lib/data/directory.ts` already omits email from SELECT; badge UI must not touch owner_id or email |
| `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` is forbidden | YES | Script reads `SUPABASE_SERVICE_ROLE_KEY` from env only; never referenced in any `app/**` or `components/**` file |
| `import 'server-only'` on admin client | YES — but script is `.mjs`, not an `app/**` import | Script runs as node, not via Next.js bundler. No `server-only` needed; direct `createClient` from `@supabase/supabase-js` |
| Free-tier-first, near-zero-cost | YES | Google Form (free), Resend free tier (≤100/day), no new infra |
| No admin UI at MVP | YES | D-06 locks script-driven seeding |
| `getUser()` over `getSession()` on server | N/A — script is not a server component | Skip |
| SPF/DKIM/DMARC configured | PREREQ | Phase 1 deliverable; Phase 7 re-verifies via mail-tester |
| Georgia-only honor system | YES | Google Form county field is REQUIRED (D-04); script validates `county_id` is in `13001..13321` FIPS range |
| Apple Sign-In deferred | YES — skip PITFALLS §13 item 12 | N/A |

## Sources

### Primary (HIGH confidence)
- In-repo: `/Users/ashleyakbar/barterkin/scripts/seed-georgia-counties.mjs` — admin script pattern
- In-repo: `/Users/ashleyakbar/barterkin/scripts/send-mailtest.mjs` — Resend send pattern
- In-repo: `/Users/ashleyakbar/barterkin/tests/unit/contact-eligibility.test.ts` lines 31–74 — `admin.auth.admin.createUser({ email_confirm: true })` + `admin.auth.admin.deleteUser(id)` working pattern
- In-repo: `/Users/ashleyakbar/barterkin/supabase/migrations/003_profile_tables.sql` line 233 — `founding_member boolean not null default false` verified
- In-repo: `/Users/ashleyakbar/barterkin/components/landing/FoundingMemberCard.tsx` lines 30–35 — existing badge styling to reuse
- In-repo: `/Users/ashleyakbar/barterkin/lib/data/landing.ts` lines 74–119 — `getFoundingMembers` query pattern
- In-repo: `/Users/ashleyakbar/barterkin/.planning/research/PITFALLS.md` §13 + "Looks Done But Isn't" checklist (lines 320–343, 587–611)
- In-repo: `/Users/ashleyakbar/barterkin/legacy/index.html` lines 696–706 — the 11 founding-member listings
- In-repo: `/Users/ashleyakbar/barterkin/package.json` — dependency versions verified
- [Supabase: Auth Admin API](https://supabase.com/docs/reference/javascript/admin-api) — confirms `auth.admin` namespace
- [Supabase: createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser) — `email_confirm` parameter confirmed
- [Supabase: listUsers](https://supabase.com/docs/reference/javascript/auth-admin-listusers) — pagination API + `page`, `perPage` confirmed
- [Supabase: Postgres Roles](https://supabase.com/docs/guides/database/postgres/roles) — service_role has BYPASSRLS

### Secondary (MEDIUM confidence)
- [GitHub issue supabase/auth#880 — `getUserByEmail` request](https://github.com/supabase/auth/issues/880) — confirms method is NOT implemented in JS SDK
- [Supabase Discussion #18780 — accessing auth.users](https://github.com/orgs/supabase/discussions/18780) — confirms service-role SQL access is correct path
- [Resend docs: sending](https://resend.com/docs) — `from`, `to`, `subject`, `text`, `html` contract

### Tertiary (LOW confidence)
- None — all findings anchored in either official docs or verified in-repo code.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, versions locked, patterns demonstrated by existing scripts and tests in-repo
- Architecture: HIGH — three-step transaction pattern directly mirrors working `tests/unit/contact-eligibility.test.ts` code
- Pitfalls: HIGH for the critical `getUserByEmail` finding (verified via official docs + GitHub issue); HIGH for the PITFALLS §13 cross-reference (canonical internal doc); MEDIUM for Resend quota risk (depends on Ashley's historical usage)
- Assumptions: LOW — 6 assumptions explicitly flagged. Most are external/operational (Ashley's Google Workspace, inbox monitoring, TikTok handle freshness) — not technical unknowns.

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable; only Supabase Auth SDK changes would invalidate). Re-verify the `getUserByEmail` API before Phase 7 execution if that happens after a Supabase Auth SDK major bump.

---

*Phase: 07-pre-launch-seeding*
*Research gathered: 2026-04-21*
