# Barterkin Infrastructure

> **Last updated:** 2026-05-11  
> **Scope:** Validation, sanitization, rate limiting, logging, observability, health checks

---

## Table of Contents

1. [Input Validation & Sanitization](#input-validation--sanitization)
2. [Rate Limiting](#rate-limiting)
3. [Logging & Observability](#logging--observability)
4. [Health Checks](#health-checks)

---

## Input Validation & Sanitization

All user inputs pass through **two layers** before reaching the database:

1. **Zod schema validation** — type + shape + bounds checking
2. **Text sanitization** — defense-in-depth against injection + normalization

### Files

| File | Purpose |
|------|---------|
| `lib/utils/validation.ts` | `validateAndSanitize()` wrapper + reusable Zod validators |
| `lib/utils/sanitize.ts` | `sanitizeText()`, `sanitizeMultiline()`, `sanitizeSlugLike()` |

### Usage in server actions

```typescript
import { validateAndSanitize } from '@/lib/utils/validation'
import { ListingFormSchema } from '@/lib/utils/validation'

const result = validateAndSanitize(ListingFormSchema, rawFormData)
if (!result.ok) {
  return { ok: false, error: result.error, fieldErrors: result.fieldErrors }
}
const clean = result.data   // safe to insert
```

### Sanitization rules

| Field type | Strategy | Example fields |
|------------|----------|----------------|
| Multi-line | `sanitizeMultiline()` — preserves `\n`, caps at 2 consecutive | `bio`, `description`, `content`, `initialMessage` |
| Single-line | `sanitizeText()` — collapses to single space, trims | `title`, `displayName`, `tradeTerms`, `tiktokHandle` |
| Slug-like | `sanitizeSlugLike()` — lowercase, alphanumeric + `_.-` only | `username` (auto-generated) |

All sanitizers strip:
- Control characters (`\x00`–`\x1F`, `\x7F`)
- HTML-like tags (`<...>`) — defense-in-depth; UI never renders raw HTML
- Leading/trailing whitespace

### Reusable validators (`lib/utils/validation.ts`)

| Validator | Purpose |
|-----------|---------|
| `emailSchema` | RFC-ish email + disposable-domain blocklist |
| `uuidSchema` | UUID v4 format |
| `currencySchema` | Non-negative numeric string (e.g. `"12.50"`) |
| `phoneSchema` | E.164 format (`+15551234567`) |
| `urlSchema` | HTTPS URLs only |
| `georgiaCountySchema` | Valid Georgia county FIPS code (1–159) |

---

## Rate Limiting

Two independent systems:

| System | Key | Use case | File |
|--------|-----|----------|------|
| **User-based** | `userId` | Authenticated mutations (create listing, send message, etc.) | `lib/utils/rate-limit.ts` |
| **IP-based** | Client IP | Public / unauthenticated endpoints (magic link, OAuth callback, etc.) | `lib/rate-limit-public.ts` |

### User-based rate limiting (`lib/utils/rate-limit.ts`)

Uses Upstash Redis with in-memory fallback. Applied to:

| Action | Preset | Limits |
|--------|--------|--------|
| Create listing | `limitCreateListing` | Configurable via Redis |
| Send message | `limitSendMessage` | Configurable via Redis |
| Submit rating | `limitSubmitRating` | Configurable via Redis |
| Create ticket | `limitCreateTicket` | Configurable via Redis |
| Create dispute | `limitCreateDispute` | Configurable via Redis |

### IP-based rate limiting (`lib/rate-limit-public.ts`)

Uses Upstash Redis with **in-memory Map fallback** for dev. IP detection parses:
- `CF-Connecting-IP` (Cloudflare)
- `X-Forwarded-For` (Vercel / generic proxy)
- `X-Real-IP` (nginx / custom)

| Preset | Endpoint | Limit |
|--------|----------|-------|
| `limitAuthRequest` | Magic link, signup | 5 / 15 min |
| `limitOAuthCallback` | OAuth callback | 20 / 5 min |
| `limitChatbotMessage` | Chatbot | 30 / 1 min |
| `limitReportSubmission` | Report member | 5 / hour |
| `limitBlockAction` | Block member | 10 / hour |
| `limitGeneralApi` | Generic API | 100 / 1 min |

**Important:** IP-based limiting is best-effort. NAT, mobile networks, VPNs, and Tor may share IPs across many users. Keep limits generous and add Turnstile for sensitive flows.

---

## Logging & Observability

### Structured logger (`lib/utils/logger.ts`)

Server-only structured logger with 5 severity levels:

| Level | Use case |
|-------|----------|
| `debug` | Verbose tracing (dev only) |
| `info` | Normal operations |
| `warn` | Recoverable issues |
| `error` | Failures requiring attention |
| `fatal` | Crash-level events |

**Features:**
- Trace ID correlation across a request lifecycle
- Component scoping via `createLogger('componentName')`
- Pretty-print in dev, JSON in production
- `LOG_LEVEL` env var controls minimum level

```typescript
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('listings')
log.info('Created listing', { context: { listingId, userId } })
log.error('Insert failed', { error: err, context: { listingId } })
```

### Request observability (`lib/observability.ts`)

Helpers for request/response logging and error wrapping:

| Function | Use |
|----------|-----|
| `logRequest(meta)` | Log incoming request at route start |
| `logResponse(meta, status, durationMs, error?)` | Log completed request with timing |
| `logServerError(component, err, context?)` | Log unhandled errors in catch blocks |
| `withErrorLogging(fn, component)` | Wrap a function, auto-log errors |
| `withTiming(fn, component, label?)` | Wrap a function, auto-log duration |

### Client logger (`lib/utils/client-logger.ts`)

Browser-side structured logger. Async-imported to avoid server bundle contamination.

```typescript
import { createClientLogger } from '@/lib/utils/client-logger'

const log = createClientLogger('component-name')
log.info('User clicked submit')
```

---

## Health Checks

### Endpoints

| Endpoint | Runtime | What it checks | Use for |
|----------|---------|----------------|---------|
| `GET /api/health` | `nodejs` | Supabase + Redis + Resend | Uptime monitoring, deployment verification |
| `GET /api/health/simple` | `edge` | Nothing (immediate 200) | CDN probes, Vercel edge health, quick pings |

### `/api/health` response

**Healthy (200):**
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

**Degraded (503):** One or more non-critical dependencies failed. App still serves traffic.

**Unhealthy (503):** One or more critical dependencies failed. App may be impaired.

| Dependency | Critical? | Check method |
|------------|-----------|--------------|
| Supabase | ✅ Yes | REST HEAD to `/rest/v1/` |
| Redis | ✅ Yes | PING via Upstash REST |
| Resend | ❌ No | Domain list fetch |

Both endpoints return `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`.

---

## Environment Variables

| Variable | Required | Used by |
|----------|----------|---------|
| `UPSTASH_REDIS_REST_URL` | ✅ | Rate limiting (both systems) |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Rate limiting (both systems) |
| `LOG_LEVEL` | ❌ | Logger minimum level (`debug`/`info`/`warn`/`error`) |
| `NEXT_PUBLIC_APP_VERSION` | ❌ | Health check response |

---

## Testing

```bash
# Unit tests cover all infrastructure
pnpm test -- --run

# Specific infrastructure tests
pnpm test -- --run tests/unit/rate-limit-public.test.ts
pnpm test -- --run tests/unit/logger.test.ts
pnpm test -- --run tests/unit/health-check.test.ts
```
