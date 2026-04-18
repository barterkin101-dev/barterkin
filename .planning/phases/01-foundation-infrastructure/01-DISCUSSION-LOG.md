# Phase 1: Foundation & Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 01-foundation-infrastructure
**Areas discussed:** Git + GitHub repo, Landing page transition
**Areas skipped by user (defaults applied in CONTEXT.md):** CI strictness + branching, Supabase migrations workflow

---

## Git + GitHub repo

### Q1: GitHub repository name?

| Option | Description | Selected |
|---|---|---|
| barterkin (Recommended) | Matches umbrella brand. Future-proof if you expand beyond Georgia. Rename ~/georgia-barter directory to ~/barterkin locally to match. | ✓ |
| georgia-barter | Matches current directory + roadmap Phase names. Accepts the brand/repo-name mismatch. | |
| barterkin-web | Explicit about what this repo is. Leaves room for barterkin-mobile, barterkin-infra, etc. later. | |

**User's choice:** barterkin
**Notes:** Aligns with `barterkin101@gmail.com` Google handle and the umbrella-brand decision from the /gsd-explore session.

### Q2: Public or private GitHub repo?

| Option | Description | Selected |
|---|---|---|
| Private until launch (Recommended) | Pre-launch code stays private. Flip to public at v1 launch. | |
| Public from day 1 | Build-in-public vibe. Attracts early community; exposes half-finished state. | ✓ |
| Private forever | Commercial product, closed source. | |

**User's choice:** Public from day 1
**Notes:** Ashley chose transparency over the recommended "private until launch." This drives D-06 through D-09 (rigorous secret hygiene) and makes gitleaks non-optional.

### Q3: What happens to the existing ~/georgia-barter/index.html?

| Option | Description | Selected |
|---|---|---|
| Move to legacy/ in repo (Recommended) | Preserve the original design + palette values while Netlify keeps serving it. Delete after new landing ships in Phase 6. | ✓ |
| Delete from repo | Netlify keeps a copy. Risk if Netlify site gets pruned. | |
| Keep at repo root | Stays alongside the Next.js scaffold until Phase 6. Slightly messy. | |

**User's choice:** Move to legacy/ in repo

### Q4: When to connect the GitHub repo to Vercel for autodeploy?

| Option | Description | Selected |
|---|---|---|
| After first scaffold commit (Recommended) | First Vercel deploy succeeds; cleanest signal that infra works. | ✓ |
| Now (empty repo) | Link Vercel to empty repo; first push triggers first deploy. First deploys will fail until scaffold exists. | |

**User's choice:** After first scaffold commit

---

## Landing page transition

### Q1: Where does barterkin.com point RIGHT NOW (during Phase 1-5 development)?

| Option | Description | Selected |
|---|---|---|
| Netlify (legacy page) (Recommended) | Soft switch. Visitors see a real page while you build the new app on Vercel preview URLs. | ✓ |
| Vercel (new Next.js app) | Hard switch from day 1. App shows 'coming soon' during build. Legacy retires immediately. | |
| Coming-soon holding page | Build a minimal 'Barterkin — launching soon' page, deploy to Vercel, point domain at it. | |

**User's choice:** Netlify (legacy page)
**Notes:** Chooses real-page-visible over coming-soon. Drives D-10 and D-14 (Phase 1 must add DNS records for Netlify).

### Q2: Where does the legacy index.html live during development?

| Option | Description | Selected |
|---|---|---|
| Stays at Netlify's current URL (Recommended) | Do nothing. Netlify continues serving at whatever *.netlify.app subdomain it got. | ✓ |
| Move to legacy.barterkin.com | Point a subdomain at Netlify. 1 extra DNS record. | |
| Unpublish Netlify site | Take it offline entirely. Repo copy in legacy/ is the only remaining reference. | |

**User's choice:** Stays at Netlify's current URL

### Q3: What URL pattern for Vercel preview deployments?

| Option | Description | Selected |
|---|---|---|
| Default Vercel subdomains (Recommended) | Vercel auto-assigns *.vercel.app URLs per PR branch. No extra DNS. | ✓ |
| preview.barterkin.com | Pin the LATEST preview to a stable subdomain. Harder per-branch; more DNS work. | |

**User's choice:** Default Vercel subdomains

### Q4: At Phase 6 cutover, how do we swap barterkin.com from Netlify to Vercel?

| Option | Description | Selected |
|---|---|---|
| DNS record swap + Netlify unpublish (Recommended) | Update Cloudflare DNS to Vercel, verify live, unpublish Netlify. ~10 min cutover. | ✓ |
| Keep Netlify warm for rollback | Cut DNS to Vercel but leave Netlify published for 30 days. Dual-state confusion. | |
| Cloudflare Worker traffic shift | Canary rollout. Overkill for solo MVP. | |

**User's choice:** DNS record swap + Netlify unpublish

---

## Claude's Discretion (applied defaults — user skipped these areas)

### CI strictness + branching
- Branching: `main` + feature branches. No branch protection rules.
- CI: lint + typecheck + test + Vercel preview. Four green gates for a clean PR, not enforced.
- No CD beyond Vercel's push-to-main → prod.

### Supabase migrations workflow
- Migrations versioned in `supabase/migrations/*.sql`.
- Local: `supabase db reset` / `supabase db push`. Remote apply is manual.
- CI runs migrations against ephemeral Postgres for integration tests only.
- Retire the auto-created us-east-2 starter project as Phase 1 housekeeping.

---

## Deferred Ideas

- Cloudflare Turnstile site-key provisioning (Phase 2)
- Final PWA icon assets (Phase 6)
- Bun vs pnpm reconsider (revisit if pnpm hurts)
- CI auto-apply migrations on merge (revisit at N > 1 devs)
- Coming-soon holding page (considered, rejected)
- legacy.barterkin.com subdomain (considered, rejected)
- Canary rollout at Phase 6 cutover (overkill)
