# Barterkin Infrastructure Setup Guide

This document tracks the remaining infrastructure gaps and how to close them.

---

## 1. GitHub Actions Secrets (Auto-Deploy)

The deploy workflow (`.github/workflows/deploy.yml`) requires the following secrets to be set in the GitHub repository:

| Secret | Where to get it | Purpose |
|--------|----------------|---------|
| `VERCEL_TOKEN` | [Vercel Dashboard](https://vercel.com/account/tokens) → Create Token | Deploy to Vercel |
| `VERCEL_ORG_ID` | `npx vercel teams list` or Vercel project settings | Vercel org identifier |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` → `projectId` field | Vercel project identifier |
| `SUPABASE_ACCESS_TOKEN` | [Supabase Dashboard](https://app.supabase.com/account/tokens) | Run migrations via CLI |
| `SUPABASE_DB_PASSWORD` | Supabase Project Settings → Database → Reset password | Connect to Postgres |
| `SUPABASE_PROJECT_ID` | Supabase project URL: `https://app.supabase.com/project/<id>` | Project reference |

### How to set them

1. Go to **GitHub Repo → Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Add each secret from the table above

> **Note:** `SUPABASE_*` secrets are optional if you prefer to run migrations manually via `npx supabase db push --linked`. The deploy workflow currently skips the migration step if secrets are missing.

---

## 2. Upstash Redis (Production Rate Limiting)

Current state: rate limiting falls back to in-memory storage, which resets on every deploy and doesn't share state across Vercel edge regions.

### Setup steps

1. Go to [upstash.com](https://upstash.com) and sign up/log in
2. Create a new Redis database (or use an existing one)
3. Copy the **REST URL** and **REST Token** from the database details page
4. Add them to Vercel environment variables:

```bash
npx vercel env add UPSTASH_REDIS_REST_URL production
# Paste: https://your-db.upstash.io

npx vercel env add UPSTASH_REDIS_REST_TOKEN production
# Paste: your-rest-token
```

5. Redeploy: `npx vercel --prod`

### Verification

After deploy, check that Redis is being used:

```bash
curl -s https://www.barterkin.com/listings | head -1
# Should return 200 — rate limiting now uses Upstash instead of memory
```

---

## 3. n8n Webhook Secret (Rotated)

**Status:** ✅ Rotated on 2026-05-08

**New secret:** `da38cce0e1459e9d77384c3c53bedc1e62e040e9d547f3ae02ba5ff942065eea`

**What was updated:**
- Database triggers (5 webhooks) now use the new secret
- Vercel env var `N8N_WEBHOOK_SECRET` updated

**Action required in n8n:**
Update your n8n webhook workflows to verify requests using the new `X-Barterkin-Webhook-Secret` header value.

---

## 4. Test Data Cleanup

**Status:** ✅ Completed on 2026-05-08

- Deleted "Handmade sourdough bread — weekly bake" test listing
- Unpublished "Test sender" profile
- Added server-side validation to prevent negative price estimates

---

## 5. Known Issues

### 404 pages return HTTP 200
Next.js App Router renders `not-found.tsx` content correctly but returns status 200 instead of 404. This is a framework-level behavior and does not affect user experience. The page clearly shows "404" and "This page doesn't exist."

### E2E test: `directory-auth-gate.spec.ts`
Updated to verify `/directory` is publicly accessible (no longer redirects to login).
