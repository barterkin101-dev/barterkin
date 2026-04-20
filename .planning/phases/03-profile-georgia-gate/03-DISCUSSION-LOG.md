# Phase 3: Profile & Georgia Gate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 03-profile-georgia-gate
**Areas discussed:** Profile editor structure, Skills input UX, Username for /m/[username]

---

## Profile Editor Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single page, sections | One scrollable page with visual sections (Basic Info, Skills, Location & Category, Preferences). Simpler to build, easier to save partially, no back/forward state needed. shadcn/ui Card per section. | ✓ |
| Multi-step wizard | Step-by-step flow with navigation guards and partial-save logic. | |
| You decide | Claude picks the approach. | |

**User's choice:** Single page with sections

---

| Option | Description | Selected |
|--------|-------------|----------|
| /profile/edit | Dedicated editor route, separate from the view. | ✓ |
| /profile (inline toggle) | Single route toggling view/edit inline. | |
| /onboarding (first-time only) | Separate onboarding flow for first creation. | |

**User's choice:** /profile/edit

---

| Option | Description | Selected |
|--------|-------------|----------|
| Single save button at bottom | User edits everything and hits one Save button. | ✓ |
| Auto-save on field blur | Each field saves on tab-out (debounced). | |
| Per-section save buttons | Each section card has its own Save. | |

**User's choice:** Single save button at bottom

---

| Option | Description | Selected |
|--------|-------------|----------|
| Stay on /profile/edit with success toast | User stays in the editor and sees a "Saved" toast. | ✓ |
| Redirect to /profile (view mode) | After saving, user sees profile as others see it. | |
| You decide | Claude picks. | |

**User's choice:** Stay on /profile/edit with success toast

---

## Skills Input UX

| Option | Description | Selected |
|--------|-------------|----------|
| Dynamic text rows | Start with 1 empty row, "+ Add skill" adds more (up to 5), each row has a remove (×) button. No extra libs. | ✓ |
| Tag chip input | User types and presses Enter to create chip tags. Needs custom component or lib. | |
| Fixed 5-row grid | Always show 5 rows, fill as many as needed. Simplest to build. | |

**User's choice:** Dynamic text rows

---

| Option | Description | Selected |
|--------|-------------|----------|
| Two separate sections | "Skills I Offer" and "Skills I Want" as distinct labeled sections. Mirrors DB schema. | ✓ |
| Tabbed interface | One section with Offered/Wanted tabs. Saves vertical space. | |

**User's choice:** Two separate sections

---

## Username for /m/[username]

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-slug from display name | Generated server-side from display name (kerry-smith), suffix for collisions. User doesn't pick it. | ✓ |
| User-chosen handle | User picks their own @handle. Needs uniqueness check UI and validation. | |
| UUID-based | URL is /m/[uuid]. Simple but ugly and unshare-friendly. | |

**User's choice:** Auto-slug from display name

---

| Option | Description | Selected |
|--------|-------------|----------|
| No — set once on first save | Slug generated on first profile save, locked after. Prevents broken links. | ✓ |
| Yes — changeable anytime | User can update slug. Needs redirect handling for old URLs. | |
| You decide | Claude picks based on MVP scope. | |

**User's choice:** Set once, locked

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auth-gated — must be logged in | Only authenticated + email-verified users can view profile pages. | ✓ |
| Public — anyone with the link | Publicly accessible, crawlable. Good for sharing but more privacy complexity. | |
| You decide | Claude picks. | |

**User's choice:** Auth-gated

---

## Claude's Discretion

- Avatar upload approach (canvas resize) and Storage path structure (`avatars/{user_id}/avatar.jpg`)
- Publish gate UI (disabled toggle with tooltip + inline checklist)
- County typeahead implementation (static JSON + shadcn Combobox, no Postgres round-trip)
- Route group for authenticated shell (`app/(app)/`)

## Deferred Ideas

- Phase 2 captchaToken bug — not Phase 3 scope
- Profile photo cropping UI — MVP uses simple resize
- Username change flow — post-MVP if needed
- Public profile pages — post-launch consideration
