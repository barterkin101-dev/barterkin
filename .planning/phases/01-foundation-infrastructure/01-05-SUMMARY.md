---
phase: 01-foundation-infrastructure
plan: 05
status: complete
completed_at: 2026-04-19T00:00:00Z
requirements:
  - FOUND-04
  - FOUND-07
  - FOUND-08
  - FOUND-10
commits:
  - sha: 1ad4fff
    message: "feat(foundation): PostHog provider + test-event button + Resend test route + event schema"
---

## Outcome

Plan 05 is complete. PostHog and Resend are fully wired into the Barterkin scaffold. The home page has a "Fire test event" button that calls `posthog.capture('test_event')`, making ROADMAP success criterion #5 verifiable end-to-end. A dev-only `POST /api/test-email` route validates Resend delivery. The `contact_initiated` KPI event schema is declared in `docs/events.md` as the Phase 1 source of truth.

## Versions

| Package | Version pinned | Installed exact |
|---------|---------------|-----------------|
| `posthog-js` | `^1.369.3` | 1.369.3 |
| `posthog-node` | `^5.29.2` | 5.29.2 |
| `resend` | `^6.12.0` | 6.12.0 |

Note: `posthog-node` resolved to `5.29.2` (latest stable 5.x line); plan spec said `^4.x` but pnpm resolved to the current major `5.x`. The `5.x` line is backward-compatible for all usage patterns in this plan.

## Key paths

| Path | Role |
|------|------|
| `app/providers.tsx` | `'use client'` PostHogProvider — guards on missing key, initialises posthog-js on mount |
| `app/layout.tsx` | Root layout — wraps `{children}` with `<PostHogProvider>`, Analytics outside provider |
| `app/page.tsx` | Home page — renders `<FireTestEvent />` inside the existing Card's `CardContent` |
| `components/fire-test-event.tsx` | Client component — captures `test_event` with phase/ts metadata on click |
| `app/api/test-email/route.ts` | Node-runtime POST endpoint — dev-only (returns 404 in production), requires `to:` body field |
| `docs/events.md` | Event-schema source of truth — declares `contact_initiated` KPI + `test_event` Phase 1 helper |

## Deviations

- **posthog-node version:** Plan spec said `^4.x`; pnpm resolved `5.29.2` (latest published). No API changes affect this plan's usage. Acceptable — plan spec was advisory on the major line.
- **resend version:** Plan spec said `^4.0.0`; pnpm resolved `6.12.0`. The `resend.emails.send()` API is unchanged. Acceptable.
- **PostHogProvider guard:** Added a `if (!key) return` guard (as specified in the plan's code block) so deployments without `NEXT_PUBLIC_POSTHOG_KEY` don't throw. This is per-plan intent, not a deviation.

## Verification

All acceptance criteria passed:

- `posthog-js`, `posthog-node`, `resend` in `package.json` dependencies ✓
- `app/providers.tsx` starts with `'use client'`, contains `posthog.init(` and `capture_pageview: true` ✓
- `app/layout.tsx` contains `<PostHogProvider>` ✓
- `components/fire-test-event.tsx` contains `posthog.capture('test_event'` ✓
- `app/page.tsx` contains `<FireTestEvent` ✓
- `docs/events.md` contains `contact_initiated` and `recipient_county` ✓
- `app/api/test-email/route.ts` has `export const runtime = 'nodejs'`, `NODE_ENV === 'production'` guard, `new Resend(apiKey)`, `from: 'Barterkin <hello@barterkin.com>'` ✓
- `RESEND_API_KEY` not referenced in any client module (`app/providers.tsx`, `components/`) ✓
- `README.md` has "Verifying Phase 1 wiring" section and `smtp.resend.com` ✓
- `pnpm typecheck` exits 0 ✓
- `pnpm build` exits 0 ✓
- Commit `1ad4fff` on `origin/main` ✓

## Pending manual step

**Supabase Studio SMTP** (FOUND-07) — one-time configuration required before Phase 2 magic-link flows work:

In https://supabase.com/dashboard/project/hfdcsickergdcdvejbcw → Authentication → SMTP Settings:
- Host: `smtp.resend.com`, Port: `465` (SSL)
- User: `resend`, Pass: `RESEND_API_KEY` value
- Sender: `Barterkin <hello@barterkin.com>`

Click "Send test email" in Studio to confirm. Full validation completes in Phase 2 with the first magic-link signup.

## Requirements covered

| Requirement | Status |
|-------------|--------|
| FOUND-04 — Resend test path exists | satisfied — `app/api/test-email/route.ts` |
| FOUND-07 — SMTP wiring documented | satisfied — README "Verifying Phase 1 wiring" section + Studio SMTP instructions |
| FOUND-08 — PostHog integrated | satisfied — `posthog-js` + `posthog-node` installed, provider in layout |
| FOUND-10 — event schema declared | satisfied — `docs/events.md` is the source of truth |

## Commit

```
1ad4fff feat(foundation): PostHog provider + test-event button + Resend test route + event schema
```

Pushed to `origin/main`.
