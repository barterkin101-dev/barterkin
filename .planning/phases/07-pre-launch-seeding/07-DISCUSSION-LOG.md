# Phase 7: Pre-Launch Seeding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 07-pre-launch-seeding
**Areas discussed:** Outreach & consent capture, Admin seed script design, Path to ≥30 profiles

---

## Outreach & consent capture

| Option | Description | Selected |
|--------|-------------|----------|
| TikTok DM + Google Form | DM each listing with personal message + Google Form link. Form captures consent + data. Responses in Google Sheet. | ✓ |
| TikTok DM + reply-tracking only | DM and track responses manually in a spreadsheet. No external form. | |
| TikTok comment + DM combo | Comment publicly first to warm up, then DM. Same form. | |

**User's choice:** TikTok DM + Google Form

---

| Option | Description | Selected |
|--------|-------------|----------|
| barterkin101@gmail.com (business account) | Business Google account tied to Barterkin. | |
| knulightdistribution@gmail.com (personal) | Personal email. Warmer but mixes channels. | |
| Branded domain email (hello@barterkin.com) | Most professional. Requires domain + Resend live first. | ✓ |

**User's choice:** Branded domain email (hello@barterkin.com)
**Notes:** Requires Phase 1/2 DNS + Resend setup to be live before outreach begins.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Warm + personal | Reference specific listing by name, sign as Ashley. Feels like a real DM. | ✓ |
| Short + direct | Brief announcement: "We're building Georgia Barter Network…" | |
| You decide | Claude picks tone. | |

**User's choice:** Warm + personal

---

## Admin seed script design

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded JS object in the script | Fill a JS array in scripts/seed-founding-members.mjs directly. Simple, no CSV parsing. | ✓ |
| Read from CSV export of Google Form responses | Script reads CSV downloaded from Google Sheets. More automated but adds CSV parsing. | |
| Interactive CLI prompts | Script prompts for each field via readline. Good for one-off but slow for batch. | |

**User's choice:** Hardcoded JS object in the script

---

| Option | Description | Selected |
|--------|-------------|----------|
| Real email-based auth user via service role | supabase.auth.admin.createUser with consent email. Member can claim account later via magic link. | ✓ |
| Placeholder email (founding-N@barterkin.internal) | Synthetic email, mark verified. Simpler to seed but member can't claim without migration. | |
| Skip auth user creation — insert profile directly | Insert profile row with generated UUID, bypassing auth. Profile can never be logged into. | |

**User's choice:** Real email-based auth user via service role

---

| Option | Description | Selected |
|--------|-------------|----------|
| Send "welcome founding member" email via Resend | Automated email after seeding: "Your profile is live! Claim your account…" | ✓ |
| No email — TikTok DM when live | Manually DM each person after seeding. Personal but more manual. | |
| You decide | Claude picks notification approach. | |

**User's choice:** Send welcome founding member email via Resend

---

## Path to ≥30 profiles

| Option | Description | Selected |
|--------|-------------|----------|
| @kerryscountrylife TikTok community first | Kerry has 1,400+ followers. A post from Kerry recruiting founding members is the highest-leverage single action. | ✓ |
| Personal outreach to people you know in Dallas/Douglasville area | Direct personal asks to friends/neighbors. Slower but higher consent rate. | |
| Both — Kerry's community + personal network | Higher ceiling, more coordination. | |

**User's choice:** @kerryscountrylife TikTok community first

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — target underrepresented counties in the Google Form | Track county spread actively. Recruit from Carroll, Cobb, Cherokee if Paulding is over-represented. | ✓ |
| No — just hit 30 total, spread will naturally follow | Organic spread from 1,400+ Georgia followers. | |
| You decide | Claude determines whether active county targeting is needed. | |

**User's choice:** Yes — actively track and target underrepresented counties

---

| Option | Description | Selected |
|--------|-------------|----------|
| Written entry in STATE.md | "Founder Commitment" section in STATE.md with 14-day window. Low-friction, in git, visible to future-you. | ✓ |
| TODO item in planning backlog | Tracked todo with due date. | |
| You decide | Claude picks tracking mechanism. | |

**User's choice:** Written entry in STATE.md

---

## Claude's Discretion

- **Founding member badge UI** — not discussed; Claude picks the visual design. Suggested: small subtle chip on profile cards and detail pages.
- **PITFALLS checklist process** — not discussed; Claude includes it as a verification wave in the plan.
- **Welcome email content detail** — not discussed; Claude writes the email following the brand voice (warm, community-first, forest-green header, Barterkin branding).

## Deferred Ideas

None — discussion stayed within phase scope.
