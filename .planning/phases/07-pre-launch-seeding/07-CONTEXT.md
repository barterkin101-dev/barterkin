# Phase 7: Pre-Launch Seeding - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Prevent the empty-directory cold-start bounce (PITFALLS.md §13 — highest-severity non-technical risk). Deliver three interconnected workstreams: (1) outreach to all 11 existing `legacy/index.html` listings using a tracked consent flow; (2) an admin seed script that provisions founding-member profiles in production via Supabase service role, bypassing the public signup flow; (3) operational recruiting to reach ≥30 total seeded profiles spanning ≥2 Georgia counties × ≥3 categories before public launch. Also includes working through the PITFALLS.md "Looks Done But Isn't" pre-launch checklist and recording the founder-operator's 14-day first-response commitment in STATE.md.

**Does NOT include:** public launch announcement, paid acquisition, App Store submission, or any new product features. Phase ends when the ≥30 threshold is met and the founder commitment is documented.

</domain>

<decisions>
## Implementation Decisions

### Outreach & consent capture

- **D-01:** Outreach method is **TikTok DM + Google Form**. Send a warm, personal DM to each of the 11 listings referencing their specific listing by name (e.g., "Hey — I loved seeing GG's Goodies Galore on the original Georgia Barter page..."). DM includes a Google Form link for consent capture.
- **D-02:** Reply-to contact is **hello@barterkin.com** (branded domain email). This requires the Resend domain + barterkin.com DNS to be live before outreach begins — Phase 1/2 deliverable. Include this address in the DM so people who prefer not to use the form can email directly.
- **D-03:** DM tone is **warm and personal** — sign as Ashley, reference the specific listing content, use first-person. Not a brand blast. Each of the 11 DMs should feel individually written even if based on a shared template.
- **D-04:** Google Form captures: consent Y/N, display name / any updates, skills offered (up to 5), skills wanted (optional), county (required — this is the data the legacy listings lack), preferred email for Supabase account creation, TikTok handle (pre-filled if already known), bio/description updates. Responses land in a linked Google Sheet.
- **D-05:** The outreach message template and the Google Form are planning artifacts that the planner must produce. They are not existing code — create `docs/outreach-template.md` and a Google Form spec in the PLAN.md.

### Admin seed script

- **D-06:** Script lives at **`scripts/seed-founding-members.mjs`** (same pattern as `scripts/seed-georgia-counties.mjs`). Input is a **hardcoded JS array** at the top of the file — one object per consented founding member. You fill in the array after collecting Google Form responses. No CSV parsing, no external file.
- **D-07:** For each founding member, the script calls **`supabase.auth.admin.createUser({ email, email_confirm: true })`** to create a real Supabase auth user with email already confirmed. This gives them a real account they can claim later via magic link ("forgot password" flow). Use the `SUPABASE_SERVICE_ROLE_KEY` env var — same pattern used by the contact relay Edge Function.
- **D-08:** After creating the auth user, the script inserts directly into the `profiles` table with `founding_member = true`, `is_published = true`, and all fields from the consent form. The `founding_member` column already exists in `supabase/migrations/003_profile_tables.sql` — no new migration needed.
- **D-09:** After seeding each member, the script sends a **"welcome founding member" email via Resend** using the existing Resend API key. Email content: "Your Georgia Barter profile is live! Claim your account at barterkin.com using the email you provided — sign in with a magic link and you can edit your profile anytime." From: `hello@barterkin.com`. Subject: "You're a founding member of Georgia Barter 🌿"
- **D-10:** The script is **idempotent** — it skips any email address that already exists in `auth.users` (check via `supabase.auth.admin.getUserByEmail` before creating). Safe to re-run as more consent responses come in.

### Founding member badge UI

- **Claude's Discretion:** The `founding_member` column exists. The planner decides the badge design — suggested approach: a small inline chip with a leaf/plant emoji or subtle "Founding Member" label that appears on both profile cards (in the directory) and the full profile detail page at `/m/[username]`. Keep it subtle per SEED-04 ("subtle badge"). Do not make it the dominant visual element.

### Path to ≥30 profiles

- **D-11:** Primary recruiting channel is the **@kerryscountrylife TikTok community**. Kerry (one of the 11 existing listings) has 1,400+ followers who already follow the Georgia barter concept. After seeding Kerry's profile as a founding member, ask Kerry to post about the platform and recruiting members. This is the single highest-leverage action to reach ≥30.
- **D-12:** County spread is actively tracked. The Google Form includes county as a required field. Before declaring ≥30, verify the spread: ≥2 distinct Georgia counties AND ≥3 distinct categories. The current 11 listings skew toward Paulding County (Dallas) and agriculture — recruiting from neighboring counties (Carroll, Cobb, Cherokee) should be encouraged.
- **D-13:** The seed script's data array is the source of truth for seeded profiles. The planner must include a step to verify the count and spread after all consenting members are seeded: `SELECT county_id, category, COUNT(*) FROM profiles WHERE founding_member = true GROUP BY county_id, category`.

### Founder commitment

- **D-14:** The founder-operator's 14-day first-response commitment is documented as a **written entry in STATE.md** — added by the seed script or manually after launch, not before. Entry format: "**Founder Commitment:** Ashley (the operator) will personally reply to every contact request received in the first 14 days post-launch. Window opens: [launch date]. Window closes: [launch date + 14 days]."

### PITFALLS checklist

- **Claude's Discretion:** The planner includes the "Looks Done But Isn't" checklist from `.planning/research/PITFALLS.md` as a verification task. Each item should be tested and checked off before the ≥30 threshold is claimed. Items failing the checklist must be fixed before launch.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §Phase 7 — Goal, success criteria, dependencies (Phase 3 profile schema + Phase 5 contact relay must be live)
- `.planning/REQUIREMENTS.md` §Pre-Launch Seeding (SEED-01 through SEED-06) — All 6 requirements for this phase
- `.planning/PROJECT.md` — Core constraints: solo builder, free-tier-first, admin actions via SQL (no admin UI), member email never exposed

### Source data for the 11 listings
- `legacy/index.html` — The 11 founding-member listings (lines ~696-706). Each has: name, city, category, description, TikTok handle. Note: no email addresses captured; 3 listings have "Georgia" instead of a specific city and will need county assignment during consent.

### Existing schema (DO NOT re-create these)
- `supabase/migrations/003_profile_tables.sql` — `founding_member boolean not null default false` already exists on the `profiles` table (line annotated "SEED-04 forward-compat"). No new migration needed for the flag.
- `supabase/migrations/005_contact_relay_trust.sql` — Contact relay and trust tables already live. Phase 7 does not modify these.

### Script patterns to follow
- `scripts/seed-georgia-counties.mjs` — Pattern for service-role admin scripts (env var loading, Supabase client instantiation, idempotent INSERT). The founding-member seed script follows this exact pattern.
- `scripts/send-mailtest.mjs` — Pattern for Resend email sending from a script context.

### Pre-launch verification
- `.planning/research/PITFALLS.md` §"Looks Done But Isn't" Checklist — 24 items that must all be checked off before public launch. The planner must include a verification wave for this checklist.
- `.planning/research/PITFALLS.md` §Pitfall 13 — Cold-start context and the ≥30-profile threshold rationale.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/seed-georgia-counties.mjs` — Admin script template. The founding-member seed script reuses its env loading, service-role client setup, and idempotency pattern.
- `scripts/send-mailtest.mjs` — Resend send pattern from a Node script context (not an Edge Function).
- `supabase/migrations/003_profile_tables.sql` — `founding_member` column already in production schema. Badge UI is the only code artifact needed for SEED-04.
- Existing profile card component (Phase 4) — the founding-member badge plugs into this as a conditional element.

### Established Patterns
- Admin operations use `SUPABASE_SERVICE_ROLE_KEY` loaded from `.env.local` — never `NEXT_PUBLIC_*`. The seed script follows this convention.
- Script files are `.mjs` (ESM) in the `scripts/` directory at the repo root.
- No admin UI — admin actions are script + SQL bookmark only (per PROJECT.md constraint).

### Integration Points
- The seed script writes to `auth.users` (via Supabase Admin API) and `profiles` (direct INSERT with service role).
- The founding-member badge renders in the existing profile card component (Phase 4 deliverable) and the profile detail page (`/m/[username]`, Phase 3 deliverable). Both already exist and need a conditional badge element added.
- The welcome email goes through Resend (already configured in Phase 1/2 with DKIM/SPF).

</code_context>

<specifics>
## Specific Ideas

- **The 11 listings** (from `legacy/index.html`, lines 696-706): GG's Goodies Galore (Douglasville, food, @ggs_goodies), Kerry's Country Life (Dallas, agriculture, @kerryscountrylife), Local Homesteader (Dallas, agriculture, @llaaddyybugg), Tamathaca's Homestead (Dallas, agriculture, @tamathacal), FEYOUG Plumbing (Georgia/unknown, services, @feyoug), Ashley's Nail Studio (Dallas, beauty, @ashley), Lovelylocs (Georgia/unknown, wellness, @lovelylocs), Kelly's Kitchen (Dallas, food, @kellymystic119), Yellow Butterfly Farm (Carrollton, agriculture, @yellow_butterfly_farm), SiR Arts & Etc (South Fulton, crafts, @sir_arts), Donna Marie (Georgia/unknown, wellness, @donnamarie). Note: @kerryscountrylife, @llaaddyybugg, @tamathacal are from Dallas (Paulding County). Carrollton is Carroll County. South Fulton is Fulton County. Douglasville is Douglas County. 3 listings have no specific city — county must be confirmed during consent.
- **Kerry as amplifier:** Kerry's Country Life is the anchor listing and the community bridge. Seed Kerry first, then ask Kerry to post/recruit from her 1,400+ follower base. This is the cold-start lever.
- **Outreach template:** Should reference the specific listing by name and what they offered, acknowledge the legacy site, frame as "founding member with a badge" (tangible), include the Google Form link, and mention hello@barterkin.com as an alternative contact.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-pre-launch-seeding*
*Context gathered: 2026-04-21*
