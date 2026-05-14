# Barterkin Production Deploy Runbook

This file is a short operator entrypoint. The current production billing runbook lives in [`docs/DEPLOY.md`](docs/DEPLOY.md), which is the source of truth for Stripe env vars, webhook setup, and billing migrations.

## Prerequisites

- Vercel CLI: `npm i -g vercel`
- Supabase CLI: `npm i -g supabase`
- pnpm: `npm i -g pnpm`
- Access to Vercel project + Supabase project

## Required Secrets / Env Vars

### Vercel (Production)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PREMIUM_MONTHLY_PRICE_ID
STRIPE_PREMIUM_ANNUAL_PRICE_ID
STRIPE_FOUNDING_MONTHLY_PRICE_ID
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_TURNSTILE_SITE_KEY
ADMIN_EMAIL
RESEND_API_KEY
RESEND_WEBHOOK_SECRET
UPSTASH_REDIS_REST_URL       # NEW v1.5
UPSTASH_REDIS_REST_TOKEN     # NEW v1.5
```

### GitHub Actions Secrets
```
VERCEL_ORG_ID
VERCEL_PROJECT_ID
VERCEL_TOKEN
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_PASSWORD
SUPABASE_PROJECT_ID
```

### GitHub Actions Vars
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_TURNSTILE_SITE_KEY
```

## Deploy Steps

### Option A: GitHub Actions (Recommended)

1. Push to `main` — deploy workflow triggers automatically
2. Or trigger manually: Actions → Deploy → Run workflow

The workflow runs:
1. Full CI (lint, typecheck, unit tests, E2E)
2. Supabase migrations (`supabase db push`)
3. Vercel production deploy
4. Post-deploy smoke tests against live URL

### Option B: Manual Deploy

```bash
# 1. One-time setup
npx vercel link        # link to existing project
npx supabase login     # auth with Supabase

# 2. Run the deploy script
./scripts/deploy.sh
```

### Option C: Vercel CLI Direct

```bash
# Only if migrations are already applied
pnpm build
npx vercel --prod
```

## First-Time v1.5 Setup (Supabase)

For current billing-related migrations, follow [`docs/DEPLOY.md`](docs/DEPLOY.md#3-database-migrations). The legacy numbered migration list below predates the Stripe billing rollout.

Run these in Supabase SQL Editor **in order**:

```sql
-- 1. Listings + images
\i supabase/migrations/011_listings.sql

-- 2. Full-text search
\i supabase/migrations/012_listing_search.sql

-- 3. Ratings + Bayesian trigger
\i supabase/migrations/013_ratings.sql

-- 4. Conversations + messages
\i supabase/migrations/014_conversations.sql

-- 5. Tickets + disputes
\i supabase/migrations/015_tickets_disputes.sql

-- 6. Storage bucket + RLS
\i supabase/migrations/016_storage_listing_images.sql

-- 7. Realtime on messages
\i supabase/migrations/017_enable_realtime.sql

-- 8. n8n webhook RPCs
\i supabase/migrations/018_n8n_webhook_triggers_v2.sql
```

## Post-Deploy Verification

- [ ] `/listings` loads with filters
- [ ] `/listings/[id]` loads a listing detail
- [ ] `/dashboard/messages` loads (auth required)
- [ ] `/dashboard/tickets` loads (auth required)
- [ ] `/dashboard/disputes` loads (auth required)
- [ ] `/admin` loads with new stats cards
- [ ] `/admin/tickets` shows tickets table
- [ ] `/admin/disputes` shows disputes table
- [ ] `/admin/listings` shows listings table
- [ ] Realtime: send message, other tab receives it
- [ ] Storage: upload listing image, image appears

## Rollback

```bash
# Revert last migration
npx supabase db reset          # local only — DANGEROUS
npx vercel --prod rollback     # Vercel rollback
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Rate limit exceeded` on every action | Add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to Vercel env |
| Images not uploading | Check `listing-images` bucket exists in Supabase Storage |
| Messages not real-time | Check migration 017 ran; verify Realtime enabled in Dashboard |
| Admin pages 404 | Verify `ADMIN_EMAIL` env var matches your login email |
| n8n webhooks not firing | Create webhooks in Supabase Studio first, then record trigger names in migration 018 |
