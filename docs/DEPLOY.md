# Barterkin Deployment Runbook

> **Last updated:** 2026-05-13  
> **Target:** Vercel (production) + Supabase (Postgres/Auth/Storage)

---

## 1. Pre-flight Checklist

- [ ] `pnpm test -- --run` passes (all 252+ unit tests)
- [ ] `pnpm build` completes with 0 TypeScript errors
- [ ] `.env.local` has all required secrets (see §2)
- [ ] Supabase migrations are applied and in sync with `lib/database.types.ts`
- [ ] Stripe webhook endpoint is configured and reachable

---

## 2. Required Environment Variables

### Vercel (production)

| Variable | Source | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings → API | Supabase client URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings → API | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings → API | Server-side admin ops |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys | Stripe backend |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → endpoint secret | Webhook verification |
| `STRIPE_PREMIUM_MONTHLY_PRICE_ID` | Stripe Dashboard → Products → Premium | Checkout price ID |
| `STRIPE_FOUNDING_MONTHLY_PRICE_ID` | Stripe Dashboard → Products → Founding | Checkout price ID (optional) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys | Stripe frontend (publishable) |
| `RESEND_API_KEY` | Resend Dashboard → API Keys | Transactional email |
| `ADMIN_NOTIFY_EMAIL` | Hardcode or env | Admin report alerts |
| `NEXT_PUBLIC_SITE_URL` | `https://barterkin.com` | Canonical URL |
| `CRON_SECRET` | Generate random string | Cron job auth |
| `UPSTASH_REDIS_REST_URL` | Upstash Dashboard | Rate limiting (optional) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Dashboard | Rate limiting (optional) |
| `POSTHOG_KEY` | PostHog Project Settings | Analytics (optional) |
| `POSTHOG_HOST` | PostHog Project Settings | Analytics (optional) |

### Stripe Webhook Endpoint

Configure in Stripe Dashboard:
- **Endpoint URL:** `https://barterkin.com/api/stripe/webhook`
- **Events to listen:**
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

---

## 3. Database Migrations

Apply in order via Supabase CLI or Dashboard SQL Editor:

```bash
# Verify all migrations are applied
supabase migration list

# Apply pending
supabase migration up
```

Critical migrations for billing:
- `20260513010000_referral_credits.sql` — credits column
- `20260513020000_tier_columns.sql` — tier, stripe_customer_id, stripe_subscription_id, subscription_current_period_end

---

## 4. Build & Deploy

```bash
# Local build verification
pnpm install
pnpm test -- --run
pnpm build

# Deploy to Vercel
vercel --prod
```

---

## 5. Post-deploy Verification

1. **Health check:** `curl https://barterkin.com/api/health`
2. **Stripe webhook:** Send test event from Stripe Dashboard → verify 200
3. **Checkout flow:** Create test checkout session (Stripe test mode) → verify redirect
4. **Customer portal:** Open portal from `/dashboard/billing` → verify redirect
5. **Tier sync:** Complete test subscription → verify `profiles.tier` updates

---

## 6. Rollback Plan

If critical failure:
1. `vercel --prod` previous commit SHA
2. Or revert commit + redeploy
3. Stripe webhooks will retry automatically (3 days)

---

## 7. Monitoring

- **Vercel:** Functions tab for 5xx errors
- **Supabase:** Logs → Auth / Database / Edge Functions
- **Stripe:** Dashboard → Events for webhook delivery status
- **PostHog:** Events → `checkout_session_created`, `subscription_activated`
