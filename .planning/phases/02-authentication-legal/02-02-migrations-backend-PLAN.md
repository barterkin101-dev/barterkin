---
plan: 2
phase: 2
name: migrations-backend
wave: 1
depends_on: [1]
autonomous: true
requirements:
  - AUTH-03
  - AUTH-04
  - AUTH-05
  - AUTH-06
  - AUTH-07
  - AUTH-09
files_modified:
  - supabase/migrations/002_auth_tables.sql
  - lib/utils/disposable-email.ts
  - lib/utils/rate-limit.ts
  - lib/actions/auth.ts
  - app/auth/callback/route.ts
  - app/auth/confirm/route.ts
  - app/auth/signout/route.ts
  - app/auth/error/page.tsx
  - lib/supabase/middleware.ts
  - middleware.ts
must_haves:
  truths:
    - "Postgres has a signup_attempts counter table + check_signup_ip() function enforcing 5/IP/day"
    - "Postgres has a current_user_is_verified() helper Phase 3 RLS will consume"
    - "Postgres has a disposable-email trigger on auth.users blocking known-bad domains at the DB layer (defense-in-depth)"
    - "isDisposableEmail() returns true for mailinator.com and false for gmail.com"
    - "checkSignupRateLimit() decrements a per-IP daily counter and returns allowed=false at the 6th attempt"
    - "sendMagicLink() server action validates email with Zod, checks disposable + rate-limit, passes captchaToken to signInWithOtp"
    - "/auth/callback GET exchanges OAuth code for session and redirects to ?next (with open-redirect guard)"
    - "/auth/confirm GET verifies magic-link token_hash and redirects to ?next"
    - "/auth/signout POST clears session cookies; GET returns 405"
    - "middleware redirects authed users away from /login and /signup (AUTH-09)"
    - "middleware redirects authed-but-unverified users to /verify-pending for protected prefixes (AUTH-04)"
  artifacts:
    - path: "supabase/migrations/002_auth_tables.sql"
      provides: "signup_attempts table + check_signup_ip + current_user_is_verified + disposable-email trigger"
      contains: "create table public.signup_attempts"
    - path: "lib/utils/disposable-email.ts"
      provides: "isDisposableEmail(email) utility"
      exports: ["isDisposableEmail"]
    - path: "lib/utils/rate-limit.ts"
      provides: "checkSignupRateLimit(ip) utility"
      exports: ["checkSignupRateLimit"]
    - path: "lib/actions/auth.ts"
      provides: "sendMagicLink server action"
      exports: ["sendMagicLink"]
    - path: "app/auth/callback/route.ts"
      provides: "OAuth callback GET handler"
      exports: ["GET"]
    - path: "app/auth/confirm/route.ts"
      provides: "magic-link verifyOtp GET handler"
      exports: ["GET"]
    - path: "app/auth/signout/route.ts"
      provides: "POST-only signout handler"
      exports: ["POST"]
    - path: "lib/supabase/middleware.ts"
      provides: "extended updateSession with route-gating + email-verify gate"
      exports: ["updateSession"]
  key_links:
    - from: "lib/actions/auth.ts:sendMagicLink"
      to: "lib/utils/disposable-email.ts:isDisposableEmail"
      via: "direct import"
      pattern: "isDisposableEmail\\(.+\\)"
    - from: "lib/actions/auth.ts:sendMagicLink"
      to: "lib/utils/rate-limit.ts:checkSignupRateLimit"
      via: "direct import"
      pattern: "checkSignupRateLimit\\(.+\\)"
    - from: "lib/actions/auth.ts:sendMagicLink"
      to: "supabase.auth.signInWithOtp"
      via: "captchaToken passed in options"
      pattern: "captchaToken:"
    - from: "lib/utils/rate-limit.ts:checkSignupRateLimit"
      to: "Postgres public.check_signup_ip(text)"
      via: "supabase.rpc('check_signup_ip', ...)"
      pattern: "rpc\\('check_signup_ip'"
    - from: "lib/supabase/middleware.ts:updateSession"
      to: "supabase.auth.getClaims()"
      via: "JWKS-verified session read"
      pattern: "getClaims\\(\\)"
---

## Objective

Wave 1 backend plumbing. Builds the server-side auth layer that Wave 2 UI consumes. Specifically:

1. **Migration** — per-IP rate-limit table + `SECURITY DEFINER` helpers + disposable-email trigger on `auth.users`. Written, not pushed (Wave 3 pushes).
2. **Server-only utilities** — `isDisposableEmail()` (AUTH-07) and `checkSignupRateLimit()` (AUTH-06).
3. **Server action** — `sendMagicLink()` (AUTH-02 + AUTH-06 + AUTH-07 + AUTH-08) with Zod validation, disposable check, rate-limit check, and `signInWithOtp` call that passes `captchaToken` to Supabase (no double-verification — RESEARCH Pitfall 2).
4. **Route handlers** — `/auth/callback` (OAuth), `/auth/confirm` (magic-link), `/auth/signout` (POST-only), and `/auth/error` (fallback page).
5. **Middleware extension** — AUTH-09 route-gating (authed → away from /login & /signup) + AUTH-04 verify gate (unverified → /verify-pending).

**Purpose:** Honor user decision D-AUTH-03 (30-day session via `@supabase/ssr`), D-AUTH-04 (email-verify enforced in RLS AND middleware), D-AUTH-06 (Postgres counter, no Redis), D-AUTH-07 (`disposable-email-domains-js`), D-AUTH-09 (route group + middleware redirects).

**Output:** All server-side Phase 2 code in place; Wave 2 UI wires directly against these exports; Wave 3 pushes the migration and fills test bodies.

## Threat Model

| Boundary | Description |
|----------|-------------|
| Browser → Server Action | Untrusted form input; Zod at the action boundary is the only validation layer |
| Browser → Route Handler | Untrusted query params; open-redirect guard + code/token verification |
| Request → Postgres | Rate-limit counter must NOT be writable from anon/authenticated; only the `SECURITY DEFINER` RPC mutates it |
| JWT claims → Middleware | `email_verified` claim is trusted (it comes from Supabase Auth JWKS-verified JWT); `user_metadata` is NOT |

### STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2-01 | Tampering | `/auth/callback?next=...` and `/auth/confirm?next=...` | mitigate | Open-redirect guard: `nextParam.startsWith('/') ? nextParam : '/directory'` — copied verbatim from RESEARCH Pattern 1 & 2 |
| T-2-02 | Spoofing | CAPTCHA token replay | mitigate | Pass `captchaToken` to `signInWithOtp` ONCE; never call `/siteverify` ourselves (RESEARCH Pitfall 2). Turnstile tokens are single-use server-side. |
| T-2-03 | Spoofing | Cookie JWT | mitigate | Use `supabase.auth.getClaims()` (JWKS-verified) throughout middleware; NEVER `getSession()` (banned per CLAUDE.md) |
| T-2-04 | Elevation of Privilege | RLS bypass by unverified user | mitigate | Dual-layer gate: middleware redirects to `/verify-pending` (UX) + Phase 3 RLS policies will consume `current_user_is_verified()` (trust boundary). Phase 2 installs the helper function so Phase 3 can use it. |
| T-2-05 | Tampering | CSRF on logout | mitigate | `/auth/signout` is POST-only; GET returns 405 (Next.js default behavior when only POST is exported). Footer submits via `<form method="POST">`. (RESEARCH Pitfall 8.) |
| T-2-06 | Denial of Service | Bot mass signup | mitigate | Turnstile (primary) + per-IP `signup_attempts` counter (secondary, AUTH-06). Counter uses first `x-forwarded-for` entry per RESEARCH Pitfall 5. |
| T-2-07 | Tampering | Disposable-email domain signups | mitigate | Three layers: client-side hint (Wave 2 UX), server action `isDisposableEmail()` check (trust gate), Postgres trigger on `auth.users` (defense-in-depth for OAuth bypass — magic-link can't bypass the server action). |
| T-2-08 | Elevation of Privilege | `user_metadata` trusted for auth | mitigate | Never read `claims.user_metadata.email_verified`; always read the top-level JWT `email_verified` claim (RESEARCH anti-patterns) |
| T-2-09 | Information Disclosure | Email enumeration | mitigate | `sendMagicLink` returns the same `{ ok: true }` response for new and existing emails. Supabase Auth also does not expose which side of the "user exists" split triggered, keeping enumeration impossible via the magic-link path. |
| T-2-11 | Tampering | SECURITY DEFINER search-path hijack | mitigate | All `SECURITY DEFINER` functions set `search_path = public, pg_temp` (or `= ''` for strictly-qualified pattern) per RESEARCH Pattern 5 |

## Tasks

<task id="2-2-1" type="auto" tdd="true">
  <title>Task 2.1: Write migration — signup_attempts + helpers + disposable trigger</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-RESEARCH.md` (Pattern 5, lines 521–616 — copy verbatim)
    - `.planning/phases/02-authentication-legal/02-PATTERNS.md` (SQL Migration Layout, lines 862–871 — conventions)
    - `supabase/migrations/` (list to confirm no existing `002_` file; Phase 1 shipped migrations to here)
    - `supabase/config.toml` (confirm CLI is linked to project `hfdcsickergdcdvejbcw`)
  </read_first>
  <behavior>
    - After `supabase db reset` locally, a new `signup_attempts` table exists in `public` with RLS enabled and zero policies
    - `SELECT check_signup_ip('1.2.3.4')` called as authenticated returns `true`; called 5 more times returns `true, true, true, true, false` (the 6th call is blocked)
    - `SELECT current_user_is_verified()` returns `true` when `auth.uid()`'s `email_confirmed_at` is non-null, else `false`
    - Inserting `INSERT INTO auth.users(email, ...) VALUES ('x@mailinator.com', ...)` raises `23514 check_violation` (Postgres error code for check constraint violation)
    - Inserting `INSERT INTO auth.users(email, ...) VALUES ('x@gmail.com', ...)` succeeds (domain not in seed list)
  </behavior>
  <action>
Create `supabase/migrations/002_auth_tables.sql`. Copy the core SQL from RESEARCH Pattern 5 (lines 521–616) verbatim, plus the additions below.

The file MUST contain, in order:

```sql
-- Phase 2 — Authentication & Legal
-- Requirements: AUTH-04 (email-verify helper), AUTH-06 (per-IP rate limit), AUTH-07 (disposable-email trigger)
-- See: .planning/phases/02-authentication-legal/02-RESEARCH.md Pattern 5

----------------------------------------------------------------------
-- 1. signup_attempts rate-limit table (AUTH-06)
----------------------------------------------------------------------
create table public.signup_attempts (
  ip text not null,
  day date not null default current_date,
  count int not null default 0,
  created_at timestamptz not null default now(),
  primary key (ip, day)
);

-- RLS enabled with ZERO policies: only SECURITY DEFINER functions can mutate.
alter table public.signup_attempts enable row level security;

----------------------------------------------------------------------
-- 2. check_signup_ip — increments + returns under-limit boolean
-- Called by lib/utils/rate-limit.ts via supabase.rpc('check_signup_ip', ...)
----------------------------------------------------------------------
create or replace function public.check_signup_ip(p_ip text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_count int;
begin
  -- Opportunistic GC: keep a 7-day rolling window.
  delete from public.signup_attempts where day < current_date - interval '7 days';

  insert into public.signup_attempts (ip, day, count)
  values (p_ip, current_date, 1)
  on conflict (ip, day) do update set count = public.signup_attempts.count + 1
  returning count into current_count;

  -- AUTH-06: 5 signups per IP per day. 6th attempt is blocked.
  return current_count <= 5;
end;
$$;

grant execute on function public.check_signup_ip(text) to anon, authenticated;

----------------------------------------------------------------------
-- 3. current_user_is_verified — AUTH-04 helper for Phase 3 RLS
----------------------------------------------------------------------
create or replace function public.current_user_is_verified()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid() and email_confirmed_at is not null
  );
$$;

grant execute on function public.current_user_is_verified() to authenticated;

----------------------------------------------------------------------
-- 4. disposable_email_domains seed table (AUTH-07 defense-in-depth)
----------------------------------------------------------------------
create table public.disposable_email_domains (
  domain text primary key
);

-- Seed with a conservative starter list; the server-action check
-- (lib/utils/disposable-email.ts) uses the disposable-email-domains-js
-- package as the primary gate. This table is DEFENSE-IN-DEPTH only —
-- catches OAuth signups (which bypass the server action) using one of
-- these domains.
--
-- Quarterly refresh: rerun scripts/sync-disposable-domains.mjs to re-seed.
insert into public.disposable_email_domains (domain) values
  ('mailinator.com'),
  ('tempmail.com'),
  ('10minutemail.com'),
  ('guerrillamail.com'),
  ('throwaway.email'),
  ('yopmail.com'),
  ('maildrop.cc'),
  ('trashmail.com'),
  ('dispostable.com'),
  ('getnada.com'),
  ('mohmal.com'),
  ('mailnesia.com'),
  ('fakeinbox.com'),
  ('sharklasers.com'),
  ('tempail.com')
on conflict (domain) do nothing;

-- Read-only to everyone; writes are migrations only.
alter table public.disposable_email_domains enable row level security;
create policy "read disposable_email_domains"
  on public.disposable_email_domains
  for select
  to anon, authenticated
  using (true);

----------------------------------------------------------------------
-- 5. reject_disposable_email — trigger function on auth.users INSERT
----------------------------------------------------------------------
create or replace function public.reject_disposable_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  email_domain text;
begin
  if new.email is null then
    return new;
  end if;
  email_domain := lower(split_part(new.email, '@', 2));
  if email_domain = '' then
    return new;
  end if;
  if exists (select 1 from public.disposable_email_domains where domain = email_domain) then
    raise exception 'Disposable email domain rejected: %', email_domain
      using errcode = '23514'; -- check_violation
  end if;
  return new;
end;
$$;

drop trigger if exists reject_disposable_email_before_insert on auth.users;
create trigger reject_disposable_email_before_insert
  before insert on auth.users
  for each row execute function public.reject_disposable_email();
```

Notes for the executor:
- `search_path = public, pg_temp` on every SECURITY DEFINER — non-negotiable hardening (RESEARCH Pattern 5).
- `RLS enabled, ZERO policies` on `signup_attempts` — the pattern for "table exists but is service-role-only". The SECURITY DEFINER function bypasses RLS (that's the point).
- The trigger on `auth.users` requires the `postgres` superuser at migration-deploy time. Supabase CLI `db push` runs as postgres, so this works. Tested locally first via `supabase db reset` (Wave 3 Task 4.1).
- Do NOT push this migration yet. Wave 3 Task 4.1 runs `supabase db push` after a human runs `supabase db reset` locally to confirm it applies cleanly.

After writing, verify the SQL is syntactically valid by running (if `supabase` CLI available locally):
```bash
supabase db lint supabase/migrations/002_auth_tables.sql 2>/dev/null || echo "lint not available; skipping"
```
(If the CLI doesn't expose `db lint`, skip — Wave 3 Task 4.1 catches syntax via real `db reset`.)
  </action>
  <acceptance_criteria>
    - File `supabase/migrations/002_auth_tables.sql` exists
    - File contains `create table public.signup_attempts` (grep)
    - File contains `create or replace function public.check_signup_ip` (grep)
    - File contains `create or replace function public.current_user_is_verified` (grep)
    - File contains `create trigger reject_disposable_email_before_insert` (grep)
    - File contains `search_path = public, pg_temp` at least 3 times (one per SECURITY DEFINER function)
    - File does NOT contain `search_path = ''` (per Phase 2 we use `public, pg_temp` since we reference `public.signup_attempts`)
    - File contains at least 15 inserts into `disposable_email_domains`
  </acceptance_criteria>
</task>

<task id="2-2-2" type="auto" tdd="true">
  <title>Task 2.2: lib/utils/disposable-email.ts — isDisposableEmail helper</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-A4-PROBE.md` (from Wave 0 — confirmed export shape)
    - `.planning/phases/02-authentication-legal/02-RESEARCH.md` (Pattern 7, lines 698–709)
    - `.planning/phases/02-authentication-legal/02-PATTERNS.md` (server-only import convention, lines 495–498)
    - `lib/supabase/admin.ts` (existing `import 'server-only'` analog)
  </read_first>
  <behavior>
    - `isDisposableEmail('user@mailinator.com')` returns `true`
    - `isDisposableEmail('user@gmail.com')` returns `false`
    - `isDisposableEmail('USER@MAILINATOR.COM')` returns `true` (case-insensitive)
    - `isDisposableEmail('not-an-email')` returns `false` (malformed, no crash)
    - `isDisposableEmail('')` returns `false`
    - `isDisposableEmail('user@UNKNOWN-DOMAIN.xyz')` returns `false`
  </behavior>
  <action>
Create `lib/utils/disposable-email.ts`. Use the export shape recorded in `02-A4-PROBE.md` (from Wave 0 Task 1.5).

**If A4-PROBE recorded Outcome A** (class export, RESEARCH Pattern 7 verbatim):
```ts
import 'server-only'
import { DisposableEmailChecker } from 'disposable-email-domains-js'

const checker = new DisposableEmailChecker()

export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const domain = email.trim().toLowerCase().split('@')[1]
  if (!domain) return false
  return checker.isDisposable(domain)
}
```

**If A4-PROBE recorded Outcome B** (function export):
```ts
import 'server-only'
import { isDisposable } from 'disposable-email-domains-js'

export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const domain = email.trim().toLowerCase().split('@')[1]
  if (!domain) return false
  return isDisposable(domain)
}
```

**If A4-PROBE recorded Outcome C** (ESM-only, default export):
Use the exact import shape recorded in the probe file. The wrapper function signature stays identical.

Key requirements regardless of outcome:
1. **Line 1 MUST be `import 'server-only'`** — key codebase convention #1 in 02-PATTERNS.md. This keeps the 112 KB blocklist out of the client bundle.
2. **Export a synchronous function `isDisposableEmail(email: string): boolean`** — simpler than async; the underlying library doesn't do I/O. Wave 3 tests assert synchronous return value.
3. **Handle malformed input gracefully** — `null`, `undefined`, `''`, no `@` — all return `false` (fail-open, since the trigger + rate limit are defense-in-depth).
4. **Normalize to lowercase before checking** — some domains in the blocklist may be stored mixed-case; the library itself normalizes, but do it defensively in the caller too.

Do NOT:
- Throw on malformed input (the server action is the error-surface layer; utility should not throw)
- Add `async` to the signature (keep synchronous)
- Memoize globally (the library already does internal lookup; second call is O(1))
- Import from anywhere other than `disposable-email-domains-js` for this data
  </action>
  <acceptance_criteria>
    - `lib/utils/disposable-email.ts` exists
    - Line 1 is exactly `import 'server-only'`
    - Named export `isDisposableEmail` present (grep `export function isDisposableEmail`)
    - `pnpm typecheck` passes
    - `pnpm build` passes (no "server-only imported from client" errors)
  </acceptance_criteria>
</task>

<task id="2-2-3" type="auto" tdd="true">
  <title>Task 2.3: lib/utils/rate-limit.ts — checkSignupRateLimit helper</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-RESEARCH.md` (Pattern 5 lines 542–564 — the check_signup_ip RPC contract; Pitfall 5 — x-forwarded-for extraction)
    - `.planning/phases/02-authentication-legal/02-PATTERNS.md` (lib/utils/rate-limit.ts pattern, lines 521–552)
    - `lib/supabase/server.ts` (the server-client factory this file calls)
  </read_first>
  <behavior>
    - `checkSignupRateLimit('1.2.3.4')` returns `{ allowed: true }` on the first call for an IP on a given day
    - Called 5 more times (total 6), the 6th call returns `{ allowed: false }`
    - When the RPC returns an error, returns `{ allowed: true }` (fail-open per RESEARCH recommendation — Turnstile is the primary defense)
    - Logs errors to console.error for observability
  </behavior>
  <action>
Create `lib/utils/rate-limit.ts`.

```ts
import 'server-only'
import { createClient } from '@/lib/supabase/server'

export interface RateLimitResult {
  allowed: boolean
}

/**
 * AUTH-06: Per-IP signup rate limit (5/day).
 *
 * Calls the Postgres SECURITY DEFINER function `check_signup_ip` which:
 *   1. Increments the per-IP per-day counter in public.signup_attempts
 *   2. Returns true if count <= 5, false otherwise
 *   3. Opportunistically prunes rows older than 7 days
 *
 * Fails OPEN: if the RPC errors (DB down, migration not yet applied, etc.),
 * returns { allowed: true } so legitimate signups are not blocked.
 * Turnstile + the Postgres trigger are the primary defenses; this counter
 * is secondary. Per RESEARCH Pitfall 10.
 */
export async function checkSignupRateLimit(ip: string): Promise<RateLimitResult> {
  const cleanIp = (ip && typeof ip === 'string' ? ip.trim() : '') || 'unknown'

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('check_signup_ip', { p_ip: cleanIp })

  if (error) {
    // Fail OPEN — do not block legitimate signups on a broken rate-limiter.
    console.error('[rate-limit] check_signup_ip RPC failed', {
      ip_prefix: cleanIp.slice(0, 8),
      code: error.code,
      message: error.message,
    })
    return { allowed: true }
  }

  return { allowed: data === true }
}
```

Notes:
- `import 'server-only'` is line 1 — strict requirement (codebase convention #1).
- `'unknown'` sentinel for missing IP: prevents a null from colliding with all signups under a single bucket.
- Logged-error message does NOT include the full IP (only first 8 chars) — reduces log PII blast radius if logs are ever leaked.
- Return shape is `{ allowed: boolean }`, not bare `boolean` — future-proof for adding fields like `{ allowed, remaining }`.

The `supabase.rpc` call will fail type-check if `lib/database.types.ts` doesn't yet include the new RPC. That's expected; Wave 3 Task 4.2 regenerates types after pushing the migration. For now, if tsc complains with "Argument of type '\"check_signup_ip\"' is not assignable…", add a narrow `@ts-expect-error` comment with a TODO for Wave 3 type regen:
```ts
// @ts-expect-error - types regenerated in Wave 3 after migration push (Task 4.2)
const { data, error } = await supabase.rpc('check_signup_ip', { p_ip: cleanIp })
```
Remove the `@ts-expect-error` in Wave 3 after `lib/database.types.ts` is regenerated and includes `check_signup_ip` in the Functions map.
  </action>
  <acceptance_criteria>
    - `lib/utils/rate-limit.ts` exists
    - Line 1 is `import 'server-only'`
    - Named export `checkSignupRateLimit` present
    - Signature returns `Promise<RateLimitResult>` (or `Promise<{ allowed: boolean }>`)
    - `pnpm typecheck` passes (with `@ts-expect-error` comment present until Wave 3)
  </acceptance_criteria>
</task>

<task id="2-2-4" type="auto" tdd="true">
  <title>Task 2.4: lib/actions/auth.ts — sendMagicLink server action</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-RESEARCH.md` (Pattern 3, lines 408–472 — the full pattern)
    - `.planning/phases/02-authentication-legal/02-RESEARCH.md` (Pitfall 2 — no double CAPTCHA verify; Pitfall 5 — x-forwarded-for; Pitfall 9 — emailRedirectTo)
    - `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (Error States table, lines 165–173 — exact copy to return on each rejection path)
    - `lib/utils/disposable-email.ts` (from Task 2.2)
    - `lib/utils/rate-limit.ts` (from Task 2.3)
    - `lib/supabase/server.ts` (existing async server-client factory)
  </read_first>
  <behavior>
    - Given `formData` with valid `email` + valid `captchaToken`, returns `{ ok: true }` and Supabase receives a `signInWithOtp` call with `captchaToken` in options
    - Given `email = 'x@mailinator.com'`, returns `{ ok: false, error: "That email provider isn't supported. Please use a personal email (Gmail, Outlook, iCloud, or your own domain)." }` BEFORE calling Supabase
    - When IP counter is at 5 already, returns `{ ok: false, error: "Too many signups from this network today. Please try again tomorrow, or contact us if you think this is a mistake." }` BEFORE calling Supabase
    - Given missing/malformed email, returns `{ ok: false, error: "Please enter a valid email." }`
    - Given empty `captchaToken`, returns `{ ok: false, error: "Please enter a valid email." }` (via Zod — empty captcha is a generic "invalid input" from the user's perspective; no disclosure)
    - On generic Supabase error, returns `{ ok: false, error: "Something went wrong. Please try again in a moment." }`
    - Response for NEW email vs EXISTING email is IDENTICAL (`{ ok: true }`) — email enumeration prevention (T-2-09)
  </behavior>
  <action>
Create `lib/actions/auth.ts`. This is the single server-action file for Phase 2; no other actions needed (signout uses a route handler per RESEARCH Open Question 4).

```ts
'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isDisposableEmail } from '@/lib/utils/disposable-email'
import { checkSignupRateLimit } from '@/lib/utils/rate-limit'

const MagicLinkSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  captchaToken: z.string().min(1),
})

export interface SendMagicLinkResult {
  ok: boolean
  error?: string
}

/**
 * AUTH-02 + AUTH-06 + AUTH-07 + AUTH-08: Send a magic link with
 *   - Zod validation
 *   - Disposable-email rejection (AUTH-07 trust gate)
 *   - Per-IP rate limit check (AUTH-06)
 *   - Turnstile captchaToken passed to Supabase (AUTH-08)
 *
 * Returns { ok: true } identically for new and existing emails (anti-enumeration).
 * Returns { ok: false, error } with UI-SPEC-locked copy on known failure modes.
 *
 * This action is intended to be invoked via React 19 useActionState:
 *   const [state, formAction, pending] = useActionState(sendMagicLink, null)
 */
export async function sendMagicLink(
  _prevState: SendMagicLinkResult | null,
  formData: FormData,
): Promise<SendMagicLinkResult> {
  // 1. Zod-parse + normalize
  const parsed = MagicLinkSchema.safeParse({
    email: formData.get('email'),
    captchaToken: formData.get('cf-turnstile-response'),
  })
  if (!parsed.success) {
    return { ok: false, error: 'Please enter a valid email.' }
  }
  const { email, captchaToken } = parsed.data

  // 2. AUTH-07: disposable-email rejection (trust gate)
  if (isDisposableEmail(email)) {
    return {
      ok: false,
      error:
        "That email provider isn't supported. Please use a personal email (Gmail, Outlook, iCloud, or your own domain).",
    }
  }

  // 3. AUTH-06: per-IP rate limit
  const hdrs = await headers()
  const ip = (hdrs.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  const rl = await checkSignupRateLimit(ip)
  if (!rl.allowed) {
    return {
      ok: false,
      error:
        'Too many signups from this network today. Please try again tomorrow, or contact us if you think this is a mistake.',
    }
  }

  // 4. AUTH-02 + AUTH-08: signInWithOtp with captchaToken passed to Supabase.
  //    Supabase Auth server calls Cloudflare /siteverify ONCE — do NOT double-verify here.
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      captchaToken,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/confirm`,
      shouldCreateUser: true,
    },
  })
  if (error) {
    console.error('[sendMagicLink] signInWithOtp failed', {
      code: error.code,
      status: error.status,
      // deliberately NOT logging error.message or email — may contain PII
    })
    return { ok: false, error: 'Something went wrong. Please try again in a moment.' }
  }

  // Identical response for new and existing emails (anti-enumeration — T-2-09).
  return { ok: true }
}
```

Critical notes:
- **Zod `.trim().toLowerCase()`** before `.email()` — normalizes before validation. The `email()` check accepts lowercase + trimmed input by default but we lock it for the downstream disposable check.
- **`formData.get('cf-turnstile-response')`** — this is the name Turnstile assigns to its hidden form field; the widget emits it automatically. The LoginForm component in Wave 2 does NOT need to rename it.
- **`x-forwarded-for`** first entry — per RESEARCH Pitfall 5, Vercel sends `<client>, <edge>`; we want the client.
- **`emailRedirectTo`** uses `NEXT_PUBLIC_SITE_URL`. That env var was established Phase 1. If missing (local dev), falls back to an empty prefix which breaks OAuth — flag via env-example for dev.
- **No PostHog event capture in this action** (RESEARCH line 150: PostHog is not used for Phase 2 metrics; defer to "nice-to-have" in a later enhancement).
- **Action signature `(_prevState, formData)`** matches React 19 `useActionState` requirements.
- **Exports:** `sendMagicLink` (function) and `SendMagicLinkResult` (interface). That's it — no other exports from this file.
  </action>
  <acceptance_criteria>
    - `lib/actions/auth.ts` exists
    - Line 1 is `'use server'`
    - Named export `sendMagicLink` present
    - Exports `SendMagicLinkResult` interface or type
    - File grep contains `isDisposableEmail` (disposable check present)
    - File grep contains `checkSignupRateLimit` (rate-limit check present)
    - File grep contains `captchaToken` (passed to signInWithOtp)
    - File grep contains `emailRedirectTo` (PKCE confirm URL)
    - `pnpm typecheck` passes
  </acceptance_criteria>
</task>

<task id="2-2-5" type="auto">
  <title>Task 2.5: app/auth/callback/route.ts + /auth/confirm + /auth/signout + /auth/error</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-RESEARCH.md` (Pattern 1, lines 336–357; Pattern 2, lines 372–395; Pitfall 8 — POST-only signout)
    - `.planning/phases/02-authentication-legal/02-PATTERNS.md` (lines 57–178 — all four route-handler patterns)
    - `app/api/test-email/route.ts` (existing route-handler analog — structure + imports)
    - `lib/supabase/server.ts` (async server-client factory)
  </read_first>
  <action>
Create four files:

**File 1: `app/auth/callback/route.ts`** (OAuth exchange — AUTH-01)

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * AUTH-01: Google OAuth callback.
 * Supabase redirects here with ?code=<...> after Google consent.
 * We exchange the code for a session (cookies set via @supabase/ssr adapter)
 * and redirect to ?next (open-redirect guarded) or /directory.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/directory'
  // T-2-01 open-redirect guard: only allow relative paths starting with '/'
  const next = nextParam.startsWith('/') ? nextParam : '/directory'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[auth/callback] exchangeCodeForSession failed', {
      code: error.code,
      status: error.status,
    })
  }

  return NextResponse.redirect(`${origin}/auth/error?reason=exchange_failed`)
}
```

**File 2: `app/auth/confirm/route.ts`** (magic-link OTP verify — AUTH-02)

```ts
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * AUTH-02: Magic-link verification.
 * Supabase sends the user here after they click the link in their email.
 * URL shape: /auth/confirm?token_hash=<...>&type=email&next=<path>
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const _next = searchParams.get('next')
  // T-2-01 open-redirect guard
  const next = _next?.startsWith('/') ? _next : '/directory'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      redirect(next)
    }
    redirect(`/auth/error?reason=${encodeURIComponent(error?.message ?? 'verify_failed')}`)
  }

  redirect(`/auth/error?reason=missing_token`)
}
```

**File 3: `app/auth/signout/route.ts`** (POST-only logout — AUTH-05, T-2-05)

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * AUTH-05: POST-only logout.
 * POST-only prevents prefetch/GET-triggered accidental logout (RESEARCH Pitfall 8, T-2-05).
 * Next.js returns 405 for GET automatically when only POST is exported.
 *
 * Status 303 after POST forces browsers to re-request via GET (per HTTP spec);
 * a 302 after POST is re-POSTed by some clients.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/`, { status: 303 })
}
```

**File 4: `app/auth/error/page.tsx`** (fallback error page)

```tsx
import Link from 'next/link'

interface ErrorPageProps {
  searchParams: Promise<{ reason?: string }>
}

/**
 * Fallback error page for /auth/callback and /auth/confirm failures.
 * Surfaces a friendly retry option without exposing internal error messages.
 */
export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const { reason } = await searchParams

  const COPY: Record<string, { heading: string; body: string }> = {
    exchange_failed: {
      heading: 'Sign-in failed',
      body: "We couldn't complete sign-in with Google. Try again, or use a magic link.",
    },
    missing_token: {
      heading: 'That link is missing something',
      body: 'Request a new magic link below.',
    },
    default: {
      heading: 'Something went wrong',
      body: 'Please try signing in again.',
    },
  }
  const copy = COPY[reason ?? 'default'] ?? COPY.default

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-[400px] w-full text-center space-y-4">
        <h1 className="font-serif text-2xl font-bold leading-[1.2]">{copy.heading}</h1>
        <p className="text-base leading-[1.5] text-muted-foreground">{copy.body}</p>
        <Link
          href="/login"
          className="inline-block underline decoration-[var(--color-clay)] text-base"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  )
}
```

Critical:
- **`/auth/callback` + `/auth/confirm` are TWO files, not one** — different token shapes, different Supabase methods (RESEARCH Pitfall: don't consolidate).
- **Open-redirect guard** `.startsWith('/')` on every `next` param. Copy verbatim.
- **Status 303 on signout redirect** — otherwise POST-redirect gets re-POSTed by some browsers.
- **`/auth/signout` has ONLY a POST export** — no GET. Next.js returns 405 automatically. Wave 3 E2E test `logout.spec.ts` verifies this.
- **`/auth/error` is a PAGE (not a route handler)** — uses Next.js searchParams (async in Next 16).
- **No getSession anywhere** — these handlers create their own server client and let @supabase/ssr handle cookies.
  </action>
  <acceptance_criteria>
    - All four files exist: `app/auth/callback/route.ts`, `app/auth/confirm/route.ts`, `app/auth/signout/route.ts`, `app/auth/error/page.tsx`
    - `app/auth/callback/route.ts` exports only `GET`
    - `app/auth/confirm/route.ts` exports only `GET`
    - `app/auth/signout/route.ts` exports only `POST` (grep confirms no `export async function GET`)
    - All three handlers include `.startsWith('/')` open-redirect guard (grep)
    - `/auth/signout` returns `{ status: 303 }` (grep)
    - `/auth/error/page.tsx` reads searchParams with `await` (Next 16 async pattern)
    - `pnpm typecheck` passes
    - `pnpm build` passes
  </acceptance_criteria>
</task>

<task id="2-2-6" type="auto">
  <title>Task 2.6: Extend lib/supabase/middleware.ts + verify middleware.ts</title>
  <read_first>
    - `middleware.ts` (current Phase 1 file — DO NOT rewrite matcher, just update the comment)
    - `lib/supabase/middleware.ts` (current Phase 1 file — extend without breaking cookie handling)
    - `.planning/phases/02-authentication-legal/02-RESEARCH.md` (Pattern 6, lines 632–689; Pitfall 3 — cookie reassignment; Pitfall 4 — email_verified fallback)
    - `.planning/phases/02-authentication-legal/02-PATTERNS.md` (lines 661–672 — carries the Phase 1 cookie rules forward)
  </read_first>
  <action>
**File 1: `lib/supabase/middleware.ts` (EXTEND — do not rewrite)**

Keep the existing cookie-handling scaffold exactly as Phase 1 built it (the `let response` reassignment pattern is correct and load-bearing — RESEARCH Pitfall 3). Extend the function with AUTH-04 and AUTH-09 logic after the existing `getClaims()` call.

Replace the current file contents with the extended version below. Preserve imports, preserve the cookies adapter, preserve the `let response` reassignment. Add the route-gating logic between the `getClaims()` call and the existing `return response`.

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

// AUTH-09: authed users bounced away from these paths
const AUTH_GROUP_PATHS = ['/login', '/signup']

// AUTH-04: unverified users bounced to /verify-pending from these prefixes.
// Phase 2 installs this list in advance of /directory, /m/, /profile existing
// (Phase 3/4). Check is a no-op until those paths exist.
const VERIFIED_REQUIRED_PREFIXES = ['/directory', '/m/', '/profile']

// Paths always accessible (even to unverified users) so they don't redirect-loop
const ALWAYS_ALLOWED = [
  '/verify-pending',
  '/auth/callback',
  '/auth/confirm',
  '/auth/signout',
  '/auth/error',
  '/legal/',
]

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Primary auth check — JWKS-verified, no round-trip (CLAUDE.md: getClaims preferred).
  // NEVER use getSession() on server paths (banned).
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const isAuthed = !!claims?.sub
  // Trust the top-level email_verified claim (comes from auth.users.email_confirmed_at).
  // NEVER trust user_metadata.email_verified (writable by user — T-2-08).
  const isVerified = !!claims?.email_verified

  const pathname = request.nextUrl.pathname

  // AUTH-09: authed users should not see /login or /signup
  if (isAuthed && AUTH_GROUP_PATHS.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/directory'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // AUTH-04: unverified users are gated out of verified-only prefixes
  if (
    isAuthed
    && !isVerified
    && VERIFIED_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p))
    && !ALWAYS_ALLOWED.some((p) => pathname.startsWith(p))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/verify-pending'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
```

Notes:
- **Preserves the Phase 1 `let response` reassignment pattern** — RESEARCH Pitfall 3 "most common break."
- **`email_verified` fallback for the Google-OAuth edge case (RESEARCH Pitfall 4) is NOT added here.** Reason: adding a `getUser()` fallback makes every request incur the Auth-server round-trip on OAuth-authed users whose JWT happens to lack the claim. Deferral rationale: (a) the issue is flagged LOW frequency in GitHub issue #1620; (b) Wave 3 E2E test `verify-pending-gate.spec.ts` covers the happy path; (c) if observed in staging, add the fallback in a follow-up plan (a 5-line change). If the fallback IS added later, log it so we can measure frequency.
- **`/legal/*` is in `ALWAYS_ALLOWED`** so the Georgia non-residency clause is reachable from anywhere, including by signed-in-unverified users.
- **No changes to the matcher** — Phase 1 matcher already excludes static paths, webhooks, and asset extensions.

**File 2: `middleware.ts` (COMMENT UPDATE ONLY)**

Change line 5–6 from:
```ts
  // Phase 1: session refresh only. No route-gating (no auth UI yet).
  // Phase 2 (AUTH-04, AUTH-09) will add `(app)` and `(auth)` group redirects here.
```
to:
```ts
  // Session refresh + AUTH-04 (email-verify gate) + AUTH-09 (auth-group redirect).
  // All logic lives in updateSession; this file is just the entry point + matcher.
```

Do NOT change the matcher. Do NOT change the function body. Only the comment.
  </action>
  <acceptance_criteria>
    - `lib/supabase/middleware.ts` contains `AUTH_GROUP_PATHS` const with `/login, /signup`
    - `lib/supabase/middleware.ts` contains `VERIFIED_REQUIRED_PREFIXES` const with `/directory, /m/, /profile`
    - `lib/supabase/middleware.ts` contains `getClaims()` call (preserved from Phase 1)
    - `lib/supabase/middleware.ts` does NOT contain `getSession` (banned per CLAUDE.md)
    - `lib/supabase/middleware.ts` does NOT contain `user_metadata.email_verified` (T-2-08)
    - `middleware.ts` matcher regex is unchanged from Phase 1
    - `pnpm typecheck` passes
    - `pnpm build` passes
  </acceptance_criteria>
</task>

## Verification

After all six tasks complete:

```bash
# Files exist
ls -la supabase/migrations/002_auth_tables.sql
ls -la lib/utils/disposable-email.ts lib/utils/rate-limit.ts
ls -la lib/actions/auth.ts
ls -la app/auth/{callback,confirm,signout,error}/*.{ts,tsx}

# Key-link grep (must all return matches)
grep -l "isDisposableEmail" lib/actions/auth.ts
grep -l "checkSignupRateLimit" lib/actions/auth.ts
grep -l "captchaToken" lib/actions/auth.ts
grep -l "getClaims()" lib/supabase/middleware.ts
grep -l "startsWith('/')" app/auth/callback/route.ts app/auth/confirm/route.ts

# Banned patterns must NOT appear
! grep -r "getSession" lib/supabase/middleware.ts lib/actions/auth.ts app/auth/
! grep -r "user_metadata" lib/supabase/middleware.ts

# CI green
pnpm typecheck && pnpm lint && pnpm build
```

## success_criteria

- [ ] `supabase/migrations/002_auth_tables.sql` matches RESEARCH Pattern 5 structure (table + check_signup_ip + current_user_is_verified + disposable trigger + seed list)
- [ ] `lib/utils/disposable-email.ts` uses the export shape confirmed by 02-A4-PROBE.md
- [ ] `lib/utils/rate-limit.ts` fails OPEN on RPC error (does not block legitimate signups)
- [ ] `lib/actions/auth.ts` runs the three checks in order (Zod → disposable → rate-limit → signInWithOtp)
- [ ] `sendMagicLink` returns identical `{ ok: true }` for new and existing emails (T-2-09)
- [ ] All four route handlers (`callback`, `confirm`, `signout`, `error`) exist and compile
- [ ] `/auth/signout` is POST-only (GET returns 405)
- [ ] All open-redirect guards present (`startsWith('/')`)
- [ ] `lib/supabase/middleware.ts` extended with AUTH-09 + AUTH-04 logic; `let response` pattern preserved
- [ ] No `getSession` anywhere in new or modified files
- [ ] No `user_metadata` trusted for auth decisions
- [ ] `pnpm typecheck && pnpm lint && pnpm build` all pass

## output

After completion, create `.planning/phases/02-authentication-legal/02-02-SUMMARY.md` recording:
- Migration file size (LOC) and seed list count
- Any `@ts-expect-error` comments added (and where they'll be removed in Wave 3)
- Middleware behavior notes (Pitfall 4 fallback deferred — follow-up if observed in staging)
- Sanity note: Wave 3 Task 4.1 must run `supabase db reset` locally BEFORE `supabase db push` to verify the auth.users trigger applies
