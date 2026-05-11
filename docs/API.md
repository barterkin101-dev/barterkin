# Barterkin API Documentation

> **Version:** 0.1.0.0  
> **Last updated:** 2026-05-11  
> **Project:** https://github.com/barterkin101-dev/barterkin

---

## Table of Contents

1. [Overview](#overview)
2. [API Routes](#api-routes)
3. [Server Actions](#server-actions)
4. [Authentication](#authentication)
5. [Rate Limiting](#rate-limiting)
6. [Error Handling](#error-handling)
7. [Environment Variables](#environment-variables)

---

## Overview

Barterkin is a Next.js 16 App Router application. All data mutations happen through **Server Actions** (`'use server'`) rather than traditional REST API routes. The few API routes that exist are for health checks, webhooks, and dev-only utilities.

**Key principle:** Server Actions are the primary interface for mutations. They are called directly from React components via form submissions or programmatic invocation.

---

## API Routes

### `GET /api/health`

Full dependency health check. Tests Supabase (REST HEAD), Upstash Redis (PING), and Resend (domain list).

**Runtime:** `nodejs`

**Response (200 — healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2026-05-11T02:40:00.000Z",
  "checks": [
    { "name": "supabase", "status": "ok", "latencyMs": 45 },
    { "name": "redis", "status": "ok", "latencyMs": 12 },
    { "name": "resend", "status": "ok", "latencyMs": 89 }
  ]
}
```

**Response (503 — degraded/unhealthy):**
```json
{
  "status": "degraded",
  "timestamp": "2026-05-11T02:40:00.000Z",
  "checks": [
    { "name": "supabase", "status": "ok", "latencyMs": 45 },
    { "name": "redis", "status": "error", "latencyMs": 0, "error": "Connection timeout" },
    { "name": "resend", "status": "ok", "latencyMs": 89 }
  ]
}
```

**Headers:** `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`

**Use for:** Uptime monitoring, deployment verification, load balancer probes.

---

### `GET /api/health/simple`

Lightweight ping. Returns immediately without hitting external services.

**Runtime:** `edge`

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-05-11T02:40:00.000Z",
  "version": "0.1.0.0",
  "environment": "production"
}
```

**Headers:** Same no-cache headers as `/api/health`.

**Use for:** Vercel deployment health checks, CDN edge probes, quick "is the app up" checks.

---

### `POST /api/test-email` *(dev-only)*

Sends a test email via Resend. **Disabled in production** (returns 404).

**Rate limit:** 10 requests per minute per IP.

**Request body:**
```json
{ "to": "recipient@example.com" }
```

**Response (200):**
```json
{ "ok": true, "id": "email-id-from-resend" }
```

**Response (429 — rate limited):**
```json
{ "error": "Rate limit exceeded. Slow down." }
```

**Response (500 — missing config):**
```json
{ "error": "RESEND_API_KEY not configured — populate .env.local" }
```

---

### `POST /api/webhooks/resend` *(retired)*

Returns `410 Gone`. The email-based contact relay and `contact_requests` table have been retired in favor of in-app messaging. This route signals to Resend that the webhook subscription should be removed.

---

## Server Actions

All server actions live in `lib/actions/*.ts` and are called from client components. They use Zod validation, structured logging, and analytics tracking.

### Authentication (`lib/actions/auth.ts`)

#### `sendMagicLink(prevState, formData)`

Sends a magic link (OTP) email to the user. Creates the user if they don't exist.

**Input (FormData):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | yes | Valid email address |
| `cf-turnstile-response` | string | yes | Cloudflare Turnstile token |

**Rate limiting:**
- Layer 1: IP-based — 5 requests per 15 minutes (Redis/memory fallback)
- Layer 2: Postgres per-IP signup counter — 5 per day

**Disposable email check:** Rejects known disposable email providers.

**Returns:** `SendMagicLinkResult`
```typescript
type SendMagicLinkResult =
  | { ok: true }
  | { ok: false; error: string }
```

**Analytics:** Fires `signup_started` event (PostHog) on success.

**Error cases:**
- Invalid email format → `{"ok": false, "error": "Please enter a valid email."}`
- Disposable email → `{"ok": false, "error": "That email provider isn't supported..."}`
- Rate limited → `{"ok": false, "error": "Too many requests..."}`
- Supabase error → `{"ok": false, "error": "Something went wrong..."}`

---

### Profile (`lib/actions/profile.ts`)

#### `saveProfile(prevState, formData)`

Creates or updates the current user's profile.

**Input (FormData):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `displayName` | string | yes | 2–60 chars |
| `bio` | string | no | Max 500 chars, HTML sanitized |
| `avatarUrl` | string (URL) | no | Must be valid HTTPS URL |
| `skillsOffered` | string[] | no | Max 10 skills, 2–40 chars each |
| `skillsWanted` | string[] | no | Max 10 skills, 2–40 chars each |
| `countyId` | number | no | Georgia county FIPS code |
| `categoryId` | number | no | Category ID from seed data |
| `availability` | string | no | Free text, max 200 chars |
| `acceptingContact` | boolean | no | Whether to appear in directory |
| `tiktokHandle` | string | no | @handle format, max 30 chars |

**Auto-generated fields:**
- `username` — auto-generated from display name slug; resolves collisions with `-2`, `-3`, ..., `-{uuid}`
- `updated_at` — set automatically

**Returns:** `SaveProfileResult`
```typescript
type SaveProfileResult =
  | { ok: true; profileId: string; username: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
```

**Validation:** Uses `ProfileFormSchema` (Zod) + `validateAndSanitize()` for server-side validation with field-level error messages.

---

#### `publishProfileAction()`

Toggles the `is_published` flag on the current user's profile.

**Returns:** `SetPublishedResult`
```typescript
type SetPublishedResult =
  | { ok: true; isPublished: boolean }
  | { ok: false; error: string }
```

**Analytics:** Fires `profile_published` event on successful publish.

**Rules:**
- Profile must have `display_name`, `county_id`, and `category_id` set
- Email must be verified (`email_confirmed_at IS NOT NULL`)

---

#### `resolveUniqueSlug(supabase, base, excludeProfileId?)`

Pure helper (exported for testing). Resolves a unique username slug, trying `base`, `base-2` through `base-9`, then `base-{uuid}`.

---

### Listings (`lib/actions/listings.ts`)

#### `saveListing(prevState, formData)`

Creates or updates a listing for the current user.

**Input (FormData):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | yes | 3–100 chars |
| `description` | string | yes | 10–2000 chars, HTML sanitized |
| `categoryId` | number | yes | Valid category ID |
| `countyId` | number | yes | Valid Georgia county ID |
| `condition` | string | no | One of: `new`, `like_new`, `good`, `fair`, `poor` |
| `tradeTerms` | string | no | Max 500 chars |
| `priceEstimate` | string | no | Must be non-negative number or empty |
| `images` | string[] | no | Array of Supabase Storage image URLs |

**Rate limiting:** `limitCreateListing` — user-based, configurable via Upstash Redis.

**Returns:** `SaveListingResult`
```typescript
type SaveListingResult =
  | { ok: true; listingId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
```

---

#### `deleteListing(listingId)`

Deletes a listing. Only the owner can delete.

**Returns:** `DeleteListingResult`
```typescript
type DeleteListingResult =
  | { ok: true }
  | { ok: false; error: string }
```

---

#### `toggleListingStatus(listingId)`

Toggles `is_active` on a listing (soft-disable without deleting).

**Returns:** `ToggleListingStatusResult`
```typescript
type ToggleListingStatusResult =
  | { ok: true; isActive: boolean }
  | { ok: false; error: string }
```

---

### Messaging (`lib/actions/messaging.ts`)

#### `sendMessage(conversationId, content)`

Sends a message in a conversation. Creates the conversation if it doesn't exist.

**Rate limiting:** `limitSendMessage` — per-user rate limit.

**Input:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `conversationId` | string (UUID) | yes | Conversation ID or `'new'` |
| `content` | string | yes | Max 2000 chars |

**Returns:** `SendMessageResult`
```typescript
type SendMessageResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string }
```

**Realtime:** Messages appear instantly via Supabase Realtime subscription on the conversation page.

---

#### `markConversationRead(conversationId)`

Marks all messages in a conversation as read for the current user.

**Returns:** `MarkReadResult`
```typescript
type MarkReadResult =
  | { ok: true }
  | { ok: false; error: string }
```

---

### Contact / Trust (`lib/actions/contact.ts`)

#### `blockMemberAction(blockedUserId)`

Blocks a member. Prevents them from contacting you and hides them from your directory view.

**Rate limiting:** `limitBlockAction` — 10 per hour per user.

**Returns:** `BlockMemberResult`
```typescript
type BlockMemberResult =
  | { ok: true }
  | { ok: false; error: string }
```

**Analytics:** Fires `contact_blocked` event on success.

---

#### `reportMemberAction(reportedUserId, reason, note?)`

Reports a member to admins.

**Rate limiting:** `limitReportSubmission` — 5 per hour per user.

**Input:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `reportedUserId` | string (UUID) | yes | Profile ID of reported user |
| `reason` | string | yes | One of: `spam`, `harassment`, `scam`, `inappropriate`, `other` |
| `note` | string | no | Max 500 chars |

**Returns:** `ReportMemberResult`
```typescript
type ReportMemberResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
```

**Analytics:** Fires `contact_reported` event on success.

---

### Tickets (`lib/actions/tickets.ts`)

#### `createTicket(prevState, formData)`

Creates a support ticket.

**Input (FormData):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | string | yes | 5–100 chars |
| `message` | string | yes | 10–2000 chars |
| `source` | string | no | `web`, `chatbot`, `email` |

**Rate limiting:** `limitCreateTicket` — per-user rate limit.

**Returns:** `CreateTicketResult`
```typescript
type CreateTicketResult =
  | { ok: true; ticketId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
```

---

#### `replyToTicket(ticketId, message)`

Adds a reply to a ticket.

**Returns:** `ReplyToTicketResult`
```typescript
type ReplyToTicketResult =
  | { ok: true; replyId: string }
  | { ok: false; error: string }
```

---

### Disputes (`lib/actions/disputes.ts`)

#### `createDispute(prevState, formData)`

Creates a trade dispute.

**Input (FormData):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `listingId` | string (UUID) | yes | Related listing ID |
| `otherPartyId` | string (UUID) | yes | Other participant's profile ID |
| `reason` | string | yes | One of: `no_show`, `misrepresented`, `incomplete`, `other` |
| `description` | string | yes | 10–2000 chars |

**Rate limiting:** `limitCreateDispute` — per-user rate limit.

**Returns:** `CreateDisputeResult`
```typescript
type CreateDisputeResult =
  | { ok: true; disputeId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
```

---

### Ratings (`lib/actions/ratings.ts`)

#### `submitRating(listingId, rating, review?)`

Submits a rating for a completed trade.

**Rate limiting:** `limitSubmitRating` — per-user rate limit.

**Input:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `listingId` | string (UUID) | yes | Listing ID |
| `rating` | number | yes | 1–5 |
| `review` | string | no | Max 500 chars |

**Returns:** `SubmitRatingResult`
```typescript
type SubmitRatingResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
```

---

### Admin (`lib/actions/admin.ts`)

#### `banMember(profileId)` / `unbanMember(profileId)`

Bans or unbans a member. Only accessible to the admin user (enforced by middleware + server action).

**Returns:** `AdminActionResult`
```typescript
type AdminActionResult =
  | { ok: true }
  | { ok: false; error: string }
```

**Side effects:**
- Sets `profiles.banned = true/false`
- Banned profiles are hidden from directory (RLS policy)
- Admin sees toast confirmation

---

### Chatbot (`lib/actions/chatbot.ts`)

#### `sendChatMessage(prevState, formData)`

Sends a message to the AI chatbot.

**Input (FormData):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | yes | User message |
| `sessionId` | string | no | Existing session ID (for continuing conversations) |

**Rate limiting:** `limitChatbotMessage` — 30 per minute per IP.

**Returns:** `ChatbotMessageResult`
```typescript
type ChatbotMessageResult =
  | { ok: true; reply: string; sessionId: string; escalated?: boolean }
  | { ok: false; error: string }
```

**Escalation:** If the chatbot detects a support need, it creates a ticket automatically (`escalated: true`).

---

### Onboarding (`lib/actions/onboarding.ts`)

#### `completeOnboarding()`

Marks onboarding as complete by setting `onboarding_completed_at`.

**Returns:** `CompleteOnboardingResult`
```typescript
type CompleteOnboardingResult =
  | { ok: true }
  | { ok: false; error: string }
```

---

## Authentication

### Auth Methods

| Method | Status | Flow |
|--------|--------|------|
| Magic Link (OTP) | ✅ Active | `sendMagicLink()` → email → click link → `/auth/confirm` → auto-login |
| Google OAuth | ✅ Active | Supabase Auth redirect → callback → session |
| Apple OAuth | ⚠️ Configured | Same as Google; requires Apple Developer account |
| Email/Password | ❌ Not implemented | Magic link preferred for simplicity |

### Session Architecture

- **Middleware** (`lib/supabase/middleware.ts`): Uses `getClaims()` (fast JWKS-verified) for routing decisions. Falls back to `getUser()` for OAuth edge cases.
- **Server Components / Server Actions**: Use `getUser()` for identity/trust decisions.
- **Client Components**: Use `getUser()` via browser client (`@supabase/ssr`).
- **Never use `getSession()`** for trust decisions server-side — it reads cookies without revalidation.

### Auth Guards

| Route | Guard |
|-------|-------|
| `/admin/*` | Must be authenticated + email === `ADMIN_EMAIL` env var |
| `/dashboard/*` | Must be authenticated |
| `/profile/*` | Must be authenticated |
| `/directory` | Public (no auth required) |
| `/listings/*` | Public (browse), auth required for create/edit |
| `/onboarding` | Must be authenticated + verified + `onboarding_completed_at IS NULL` |
| `/verify-pending` | Shown when email not verified |

---

## Rate Limiting

### Public Endpoint Rate Limits (IP-based)

| Endpoint / Action | Limit | Window | Implementation |
|-------------------|-------|--------|----------------|
| Auth requests (`sendMagicLink`) | 5 | 15 min | `limitAuthRequest()` — Redis + memory fallback |
| OAuth callbacks | 20 | 5 min | `limitOAuthCallback()` |
| Chatbot messages | 30 | 1 min | `limitChatbotMessage()` |
| Report submissions | 5 | 1 hour | `limitReportSubmission()` |
| Block actions | 10 | 1 hour | `limitBlockAction()` |
| General API | 100 | 1 min | `limitGeneralApi()` |
| Test email (dev) | 10 | 1 min | `rateLimitByIp()` |

### Authenticated Rate Limits (user-based)

| Action | Limit | Window | Implementation |
|--------|-------|--------|----------------|
| Create listing | Configurable | — | `limitCreateListing()` |
| Send message | Configurable | — | `limitSendMessage()` |
| Submit rating | Configurable | — | `limitSubmitRating()` |
| Create ticket | Configurable | — | `limitCreateTicket()` |
| Create dispute | Configurable | — | `limitCreateDispute()` |

**Storage:** Upstash Redis in production. In-memory `Map` fallback for dev (resets on restart).

---

## Error Handling

### Server Action Error Pattern

All server actions return a discriminated union:

```typescript
type Result<T> =
  | { ok: true; /* success fields */ }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
```

**Client handling:**
```tsx
const [state, formAction, isPending] = useActionState(myAction, null)

if (state?.ok === false) {
  // Show error toast or field-level errors
}
```

### HTTP Status Codes (API Routes)

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (auth required) |
| 404 | Not found |
| 410 | Gone (retired endpoint) |
| 429 | Rate limited (Retry-After header provided) |
| 500 | Server error |
| 503 | Service degraded (health check) |

---

## Environment Variables

### Client-safe (`NEXT_PUBLIC_*`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Anon/publishable key |
| `NEXT_PUBLIC_POSTHOG_KEY` | ✅ | PostHog project key |
| `NEXT_PUBLIC_POSTHOG_HOST` | ✅ | PostHog API host |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | ✅ | Cloudflare Turnstile site key |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Canonical site URL |
| `NEXT_PUBLIC_APP_VERSION` | ❌ | App version (shown in health check) |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | ❌ | Microsoft Clarity project ID |

### Server-only (never prefix with `NEXT_PUBLIC_`)

| Variable | Required | Sensitive | Description |
|----------|----------|-----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 🔒 | Bypasses RLS — server only |
| `RESEND_API_KEY` | ✅ | 🔒 | Transactional email |
| `RESEND_WEBHOOK_SECRET` | ✅ | 🔒 | Resend webhook verification |
| `ADMIN_EMAIL` | ✅ | 🔒 | Admin account email for `/admin` guard |
| `UPSTASH_REDIS_REST_URL` | ✅ | 🔒 | Redis REST URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | 🔒 | Redis REST token |
| `LOG_LEVEL` | ❌ | No | Logger verbosity (`debug`, `info`, `warn`, `error`) |

---

## Data Layer (`lib/data/*.ts`)

The data layer provides typed Supabase queries for server components. Key files:

| File | Purpose |
|------|---------|
| `lib/data/directory.ts` | Public directory queries (filters, search, pagination) |
| `lib/data/listings.ts` | Listing queries (browse, detail, by owner) |
| `lib/data/messaging.ts` | Conversation + message queries |
| `lib/data/admin.ts` | Admin oversight queries (members, messages, tickets, disputes) |
| `lib/data/tickets.ts` | Ticket queries |
| `lib/data/disputes.ts` | Dispute queries |
| `lib/data/ratings.ts` | Rating queries |
| `lib/data/categories.ts` | Category seed data |
| `lib/data/landing.ts` | Landing page data (founding members, stats) |

All data functions use the server-side Supabase client with RLS enforced.

---

## Testing

### Unit Tests (Vitest)

```bash
pnpm test          # Run all unit tests
pnpm test:watch    # Watch mode
```

**Coverage:** Utility functions, Zod schemas, pure helpers, data layer, rate limiting.

### E2E Tests (Playwright)

```bash
pnpm e2e:install    # Install browsers + deps
pnpm e2e             # Run all E2E tests
pnpm e2e:ui          # Interactive UI mode
```

**Projects:** `chromium` (desktop), `iphone-se` (mobile WebKit)

**Base URL:** Set via `PLAYWRIGHT_BASE_URL` env var (defaults to `http://localhost:3000`)

### Health Check Tests

```bash
curl http://localhost:3000/api/health/simple
curl http://localhost:3000/api/health
```

---

## Schema Reference

See `lib/database.types.ts` for the full TypeScript schema generated from Supabase.

Key tables:
- `profiles` — Member profiles (RLS: owner-edit, authed-read)
- `listings` — Skill/item listings (RLS: owner-edit, authed-read active)
- `conversations` — Message threads (RLS: participant-only)
- `messages` — Individual messages (RLS: participant-only)
- `conversation_participants` — Thread membership + read tracking
- `tickets` — Support tickets (RLS: owner + admin)
- `disputes` — Trade disputes (RLS: participant + admin)
- `ratings` — Trade ratings (RLS: public read, owner-edit)
- `blocks` — Member blocks (RLS: blocker-only)
- `reports` — Member reports (RLS: reporter + admin)
- `categories` — Skill categories (seeded, public read)
- `counties` — Georgia counties (seeded, public read)

---

## Contributing

1. `pnpm install`
2. `cp .env.local.example .env.local` — fill in values
3. `pre-commit install` — gitleaks hook (mandatory for public repo)
4. `pnpm dev` — http://localhost:3000
5. `pnpm test` — verify unit tests pass
6. `pnpm e2e` — verify E2E tests pass (requires dev server running)

See `README.md` for full setup instructions and `DEPLOY.md` for deployment runbook.
