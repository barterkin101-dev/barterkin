# Phase 9: Onboarding Wizard — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 09-onboarding-wizard-multi-step-in-app-guide-for-new-members-sh
**Areas discussed:** Wizard container, Step interactivity, State persistence, Step structure

---

## Wizard Container

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated /onboarding route | Full-page wizard, own layout, no AppNav. Middleware redirects new users here. Clean URL entry point for resumption. | ✓ |
| Dialog overlay | Full-screen Dialog on /directory, blurred app behind it. Already installed. Harder to resume cleanly. | |
| Banner / persistent strip | Dismissible banner at top of /directory and /profile. No multi-step interactivity. | |

**User's choice:** Dedicated /onboarding route

---

### Dismissal and resume flow

| Option | Description | Selected |
|--------|-------------|----------|
| Land on /directory, resume via AppNav banner | Dismiss → /directory. AppNav shows "Finish setup →" link with step resume. | ✓ |
| Land on /directory, no explicit resume CTA | Dismiss → /directory. No visible prompt. Simpler but users may not return. | |
| Re-prompt on next login only | Wizard re-appears on next sign-in if not completed. | |

**User's choice:** Resume via AppNav "Finish setup →" banner linking to /onboarding?step=N

---

## Step Interactivity

| Option | Description | Selected |
|--------|-------------|----------|
| Instructional + CTA links out | Steps explain, CTA sends to real page. Wizard checks real data for completion. No duplicate forms. | ✓ |
| Inline embedded actions | Profile edit form and directory preview inside wizard. More polished, significantly more scope. | |
| Purely informational (no tracking) | 3 explanation screens only. No completion checks. | |

**User's choice:** Instructional with CTAs linking out

---

### Step 1 auto-advance mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Return to /onboarding after editing, step auto-checks | Profile edit Save → /onboarding?step=1. Wizard re-checks completeness on load. All 5 green = Next activates. | ✓ |
| Supabase Realtime listener | Wizard subscribes to profile row changes. Auto-advances live. Overkill for one-time flow. | |
| Manual "I'm done" button | User self-reports. No completion check. | |

**User's choice:** Return to /onboarding after profile edit, wizard re-checks completeness data

---

## State Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| DB column on profiles | onboarding_completed_at timestamptz (nullable). Cross-device. Needs migration. Middleware can check. | ✓ |
| localStorage only | Zero migration. Lost on device switch or browser clear. | |
| DB column + step tracking | Two columns: onboarding_completed_at + onboarding_step. Resume at exact step on any device. | |

**User's choice:** Single DB column — onboarding_completed_at (timestamptz, nullable)

---

### Completion trigger

| Option | Description | Selected |
|--------|-------------|----------|
| When user reaches and views final step | Timestamp written on Step 3 render. No action required. Users not blocked if they haven't found a contact yet. | ✓ |
| When user completes all required actions | Profile complete + contact sent. Blocks users who haven't found someone. | |
| When user explicitly clicks "Finish" | Explicit button on final step. | |

**User's choice:** Timestamp written when Step 3 is rendered (viewed), not when actions are completed

---

## Step Structure

| Option | Description | Selected |
|--------|-------------|----------|
| 3 steps: profile → directory → contact | Linear. No intro screen. Progress indicator 1/3 → 2/3 → 3/3. | ✓ |
| 4 steps: welcome → profile → directory → contact | Adds warm intro screen. More friendly but one more click. | |
| Checklist (any order) | Single screen, 3 tasks, any order. Breaks wizard mental model. | |

**User's choice:** 3 steps, linear, no intro screen

---

### Steps 2 and 3 gating

| Option | Description | Selected |
|--------|-------------|----------|
| Both steps advance freely with Next | Only Step 1 has a hard gate (profile completeness). Steps 2 and 3 are informational. | ✓ |
| Step 2 requires visiting /directory | Friction for users who already know the app. | |
| Step 3 requires a contact request sent | Blocks users who can't find someone to contact yet. | |

**User's choice:** Only Step 1 is gated. Steps 2 and 3 advance freely.

---

## Claude's Discretion

- Progress indicator visual design (dots vs. labelled tabs vs. step counter)
- Copy/tone for each step's headline and body text
- AppNav "Finish setup" link styling (badge/dot vs. plain text)
- RLS policy approach for reading own onboarding_completed_at

## Deferred Ideas

None.
