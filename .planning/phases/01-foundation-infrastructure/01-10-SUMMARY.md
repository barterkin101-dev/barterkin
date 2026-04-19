---
plan: 10
plan_name: vercel-link-deploy
status: complete
completed_at: "2026-04-19"
---

# Plan 01-10 Summary: vercel-link-deploy

## Vercel Production

- URL: `https://barterkin.vercel.app/` — HTTP/2 200 confirmed
- Team: `barterkin101-devs-projects` (team_lgW6L6OTcKom1vrTkNwdsGJ4)
- Project: `prj_JC6NliI8eNldKMh4TP3GCdfwcMjA`
- Final Phase 1 commit on main: `f27c73c`

## Smoke Tests (all pass)

- `curl -sI https://barterkin.vercel.app/` → HTTP/2 200
- `curl -s https://barterkin.vercel.app/ | grep "Barterkin foundation"` → found
- `/manifest.webmanifest` → 200
- `/sw.js` → 200
- `.vercel/project.json` → exists

## Env Vars

All 7 Phase-1 vars set in Vercel (Production + Preview). Development uses `.env.local`.
Sensitive vars (SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY) cannot be in Development scope per Vercel policy — correct pattern.

## Resend Test Email

- Endpoint: `POST http://localhost:3000/api/test-email`
- Result: `{"ok":true,"id":"80f9abf6-56eb-4cd4-9791-42207bfe8017"}`
- Delivered to: barterkin101@gmail.com

## Supabase Studio SMTP

- Configured: smtp.resend.com:465, user=resend, sender=hello@barterkin.com
- Status: configured in previous session (manual step)

## Preview Deploy (PR #1)

- Branch: `verify-preview-deploy`
- Preview URL: `barterkin-git-verify-preview-deploy-barterkin101-devs-projects.vercel.app`
- Vercel status: DEPLOYED (success)

## CI Fixes Applied (all green on commit 708cc84 / merge f27c73c)

- `pnpm@9` → `pnpm@10` (lockfileVersion 9.0 requires pnpm v10)
- `next lint` → `eslint .` (next lint removed in Next.js 16)
- Serwist sw bundles excluded from ESLint globalIgnores
- NEXT_PUBLIC_* vars added as GitHub Actions repo variables for E2E build

## CI Check Results (commit 708cc84)

| Check | Result |
|-------|--------|
| Install deps + cache | ✅ success |
| Lint | ✅ success |
| Typecheck | ✅ success |
| Unit tests (Vitest) | ✅ success |
| E2E (Playwright) | ✅ success |
| Gitleaks secret scan | ✅ success |
| Vercel Preview Comments | ✅ success |

## PostHog

- Initialized via posthog-js ESM module (not window.posthog global)
- Key `phc_m93ueHfM7xqomjhDmUb68swMwessSjnPajLj255DPu88` baked into production build
- Network requests to us.i.posthog.com return 200

## Open Items

- `scripts/cloudflare-dns.mjs` not yet committed (Plan 01-09 deferred)
- barterkin.com DNS not yet pointing at Netlify (CF_API_TOKEN required)
- mail-tester composite score not re-verified (send-mailtest.mjs available)
- us-east-2 Supabase starter (`vlrioprefvwkahryuuap`) not yet deleted
