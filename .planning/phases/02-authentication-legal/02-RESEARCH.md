# Phase 2: Authentication & Legal — Research

**Researched:** 2026-04-19
**Domain:** Supabase Auth (Google OAuth + magic link) + email-verify gate + Cloudflare Turnstile + per-IP rate limiting + disposable-email blocking + legal pages on Next.js 16.2 App Router with `@supabase/ssr` 0.10.2
**Confidence:** HIGH on core Supabase/Next integration; MEDIUM on rate-limit storage choice; LOW on whether `email_confirmed_at` is ever missing from the JWT (flagged in Open Questions)

---

## Summary

Phase 2 wires three authenticated flows — Google OAuth, email magic-link (OTP via PKCE token_hash), and logout — on top of the `@supabase/ssr` middleware already shipped in Phase 1. It layers three anti-abuse defenses — Cloudflare Turnstile, a per-IP signup counter, and a disposable-email blocklist — and an email-verify gate enforced in both middleware *and* RLS. It adds three legal pages (`/legal/tos`, `/legal/privacy`, `/legal/guidelines`) plus footer links and a logout button. The UI-SPEC in `02-UI-SPEC.md` is already approved and locks the seven surfaces, the copy, and the palette overrides — this research document is prescriptive about the *plumbing*, not the pixels.

The stack is fully determined: `@supabase/ssr@0.10.2` + `@supabase/supabase-js@2.103.3` (both installed) + `@marsidev/react-turnstile@1.5.0` (new) + `disposable-email-domains-js@1.24.0` (new, weekly-updated) + a Postgres table for per-IP signup counters (free-tier friendly, no Redis). Auth routing uses three Next.js route handlers: `app/auth/callback/route.ts` (OAuth — calls `exchangeCodeForSession`), `app/auth/confirm/route.ts` (magic-link token_hash — calls `verifyOtp`), and `app/auth/signout/route.ts` (logout — calls `supabase.auth.signOut()` then redirects). The middleware already refreshes sessions via `getClaims()` on every request; Phase 2 extends it with route-gating for `(auth)` pages (redirect authed users away) and an email-verify check for protected routes (redirect unverified users to `/verify-pending`).

**Primary recommendation:** Ship Supabase-native CAPTCHA integration (pass `captchaToken` directly to `signInWithOtp` / `signInWithOAuth` options — Supabase Auth server verifies against Turnstile), store per-IP signup counters in a new `signup_attempts` table with a daily window, and enforce email-verify in RLS via `(SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL` — RLS is the trust boundary, middleware is UX.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Google OAuth consent screen | Google (external) | — | Google Cloud Console hosts the OAuth client; Supabase is the redirect target |
| OAuth code → session exchange | Next.js route handler (`app/auth/callback/route.ts`) | Supabase Auth server | `exchangeCodeForSession` is called server-side; cookies written via `@supabase/ssr` setAll |
| Magic-link email send | Supabase Auth → Resend SMTP | — | Supabase Auth generates token; Resend delivers (already wired in Phase 1) |
| Magic-link token verify | Next.js route handler (`app/auth/confirm/route.ts`) | Supabase Auth server | `verifyOtp({ type, token_hash })` called server-side |
| Session refresh on every request | Next.js middleware | `@supabase/ssr` cookie adapter | Already wired in Phase 1 via `getClaims()` |
| Email-verify gate (appearance in directory) | Postgres RLS (primary trust boundary) | Next.js middleware (UX redirect) | RLS is server-enforced; middleware is UI convenience |
| CAPTCHA token verification | Supabase Auth server (native integration) | — | Pass `captchaToken` in `signInWithOtp`/`signInWithOAuth` options; Supabase calls Cloudflare `/siteverify` server-side |
| Per-IP signup rate limit | Next.js route handler or server action | Postgres `signup_attempts` table | Postgres counter = free-tier, no Redis; handler reads `x-forwarded-for`, writes row |
| Disposable-email blocking | Next.js server action (client hint) + Postgres trigger (defense-in-depth) | `disposable-email-domains-js` npm package | Check before calling `signInWithOtp`; trigger on `auth.users` for OAuth bypass |
| Logout | Next.js route handler (`app/auth/signout/route.ts`) | — | Calls `supabase.auth.signOut()`, middleware clears cookies on next response |
| Legal pages (ToS/Privacy/Guidelines) | Next.js static server components (`app/legal/*`) | — | Pure prose; rendered statically, indexed by search engines |
| Footer legal links + logout button | Shared layout component | — | Spans all routes; logout button server-action-driven |

---

<user_constraints>
## User Constraints (from CLAUDE.md + ROADMAP.md + UI-SPEC + STATE.md)

### Locked Decisions

- **No custom auth code — Supabase Auth only.** `@supabase/ssr@0.10.2` + `@supabase/supabase-js@2.103.3` is the only auth plumbing. No NextAuth, no Auth.js, no hand-rolled JWT verification.
- **`@supabase/auth-helpers-nextjs` is BANNED** — deprecated at v0.15.0. Not in `package.json` and must stay out.
- **`getSession()` is BANNED on all server paths** — always `getClaims()` (preferred, already wired in middleware) or `getUser()` (fallback). `getSession()` reads the cookie without revalidating; spoofable. (PITFALLS.md Pitfall 1.)
- **`getClaims()` is the primary server-side auth check** — install-time probe returned `HAS_GETCLAIMS` on `@supabase/ssr@0.10.2`. JWKS-verified, no Auth-server round-trip. Already wired in `lib/supabase/middleware.ts`. Phase 2 plans MUST use this, not `getUser()`.
- **Email-verify gate enforced in BOTH RLS and middleware.** RLS is the trust boundary; middleware is UX convenience. Requirement AUTH-04 mandates both.
- **Session persistence: 30 days.** @supabase/ssr cookie pattern (already set up in `lib/supabase/middleware.ts` — no changes needed).
- **SSO providers: Google + magic-link ONLY.** Apple Sign-In deferred to Capacitor milestone (Apple Dev $99/yr dependency).
- **Cloudflare Turnstile** is the CAPTCHA (free tier, server-side verification required via secret key).
- **Per-IP rate limit: 5 signups/day.** Requirement AUTH-06.
- **Rate-limit counter storage: free-tier friendly — no Redis, no KV.** Postgres table is the answer. (Upstash Redis free tier = 500k commands/month = borderline, and would add a vendor; Postgres is already there.)
- **Disposable-email blocking: open-source blocklist** (no paid API like Kickbox/ZeroBounce). Requirement AUTH-07.
- **Auth routes under `(auth)` route group.** Middleware refreshes session on every request AND redirects authed users away from auth pages. Requirement AUTH-09.
- **ToS/Privacy/Community Guidelines** as static pages under `app/legal/*`. Linked from signup + footer. ToS MUST include the Georgia non-residency clause (GEO-04). Exact copy locked in `02-UI-SPEC.md`.
- **Footer legal links + logout button** per UI-SPEC. No confirmation dialog on logout (reversible in 10 seconds).
- **Supabase project `hfdcsickergdcdvejbcw` (us-east-1) is the target.** SMTP already wired to Resend `hello@barterkin.com`. No DNS or SMTP changes in this phase.
- **UI-SPEC `02-UI-SPEC.md` is approved.** Exact copy, spacing, typography, color overrides are locked. Research prescribes plumbing only — never revisits design.
- **Tailwind v4 brand override lands in `app/globals.css` `@theme inline` block.** Per UI-SPEC Color section: `--color-primary: var(--color-clay)`, etc.
- **shadcn add: `Form`, `Alert`, `Separator` (new Phase 2). `Button`, `Card`, `Input`, `Label` already installed.**
- **Tests: Vitest (unit) + Playwright (E2E).** Framework already installed in Phase 1 (`tests/unit/`, `tests/e2e/` exist).
- **CI pipeline green is the phase gate.** 6 checks already wired in Phase 1 (lint, typecheck, unit, E2E, build, gitleaks).

### Claude's Discretion

- **Which table schema for `signup_attempts`.** Recommendation: `(ip text, day date, count int, primary key (ip, day))`, with a `where day = current_date` cleanup.
- **Where to enforce disposable-email block.** Recommendation: (a) client-side hint at submit time (fast feedback), (b) server-side in the magic-link server action (the trust gate), (c) Postgres trigger on `auth.users` INSERT (defense-in-depth for OAuth bypass).
- **Whether to use Supabase-native CAPTCHA integration (pass `captchaToken` in options) OR a standalone Edge Function that verifies then calls signInWithOtp.** Recommendation: use Supabase-native — fewer moving parts, Supabase docs are explicit, and the freecodecamp article confirms this is the canonical pattern.
- **PKCE vs implicit flow for OAuth.** Recommendation: PKCE (default in `@supabase/ssr`). No choice to make — it's what the library does.
- **Whether to deliver magic-link via PKCE `token_hash` URL → `/auth/confirm` (verifyOtp) OR legacy hash fragment URL → client-side `onAuthStateChange`.** Recommendation: PKCE token_hash + server-side `/auth/confirm` handler — aligns with `@supabase/ssr` defaults and is the pattern in every current Supabase example.
- **Whether `/auth/callback` and `/auth/confirm` are two separate routes or one.** Recommendation: TWO separate routes. `/auth/callback` handles OAuth `?code=`; `/auth/confirm` handles email `?token_hash=&type=`. Reason: the payload shape and the Supabase method called differ. Consolidating them into one route is a footgun.
- **Rate-limit implementation location.** Recommendation: Next.js server action for the magic-link path (has access to the submit context); Postgres trigger fallback for OAuth (OAuth can't run server actions before creating the auth.users row).
- **How long to keep `signup_attempts` rows.** Recommendation: 7 days rolling window (daily cron, or cleanup at read time). No PII stored (just IP hash + day + count), so retention is low-risk.

### Deferred Ideas (OUT OF SCOPE)

- Apple Sign-In (deferred to Capacitor milestone; requires $99/yr Apple Developer account + 6-month client-secret rotation)
- Passkeys / WebAuthn (Supabase WebAuthn is not a stable first-factor as of April 2026 — flagged LOW confidence in STACK.md)
- Phone verification (deferred to v1.1 TRUST-08 badge)
- Password-based auth (rejected — Supabase Auth only; password flows are a liability for a solo-builder)
- Admin review queue UI for auth (TRUST-10, v1.1+)
- Referral credits on signup (LATE-04)
- Signup with invite codes (not in requirements)
- Social logins beyond Google (Facebook, GitHub, etc. — not in requirements)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign up with Google OAuth | Supabase Studio Google provider already documented in STACK.md; this research adds the `app/auth/callback/route.ts` exchangeCodeForSession pattern + redirect URL matrix (localhost + Vercel preview wildcard + prod) |
| AUTH-02 | User can sign up with magic-link email (passwordless) | `signInWithOtp({ email, options: { captchaToken, emailRedirectTo } })` on client; `app/auth/confirm/route.ts` calls `verifyOtp({ type, token_hash })` on server. Canonical pattern verified against Supabase docs + community examples. |
| AUTH-03 | Session persists ≥30 days via @supabase/ssr cookies | Already wired in Phase 1 `lib/supabase/middleware.ts`. No changes needed. Validate with Playwright test that navigates after a simulated 29-day cookie age. |
| AUTH-04 | Email-verify gate enforced in RLS AND middleware | RLS policy: `(SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL`. Middleware: extend `updateSession()` to redirect to `/verify-pending` when claims lack `email_confirmed_at` AND path is outside allowlist. |
| AUTH-05 | User can log out from any page | `app/auth/signout/route.ts` POST handler calls `supabase.auth.signOut()` then `redirect('/')`. Footer "Log out" button posts to it. No confirmation dialog (UI-SPEC locks this). |
| AUTH-06 | Signup rate limit: 5/IP/day | Postgres `signup_attempts(ip, day, count)` table. Server action reads `x-forwarded-for` (trust the first entry behind Vercel) and upserts a counter. Rejects on `count >= 5`. For OAuth, a Postgres trigger on `auth.users` enforces the same limit using `auth.jwt() -> 'x-forwarded-for'`… actually `auth.users` rows don't carry IP — so OAuth path is best-effort (see Open Questions). |
| AUTH-07 | Disposable-email domains rejected | `disposable-email-domains-js@1.24.0` (weekly-updated, 112KB). Check at three layers: client hint (fast UX), server action pre-`signInWithOtp` (trust gate), Postgres trigger on `auth.users` (defense-in-depth for OAuth domains slipping through). |
| AUTH-08 | Cloudflare Turnstile gates signup | `@marsidev/react-turnstile@1.5.0` widget on `/login` + `/signup`. Token passed to server action → server passes to `signInWithOtp({ email, options: { captchaToken } })` → Supabase Auth verifies server-side. No Next.js-side `/siteverify` call needed for the auth path (Supabase does it); standalone Edge Function `/siteverify` only needed if non-auth forms need CAPTCHA in future phases. Turnstile secret lives in Supabase Studio (NOT in .env.local). |
| AUTH-09 | Auth routes in `(auth)` route group; middleware handles redirects | Create `app/(auth)/login/page.tsx` and `app/(auth)/signup/page.tsx`. Extend middleware to redirect authed users to `/directory` when path starts with `/login` or `/signup`. |
| AUTH-10 | ToS, Privacy, Community Guidelines exist + linked from signup/footer | Three static server components under `app/legal/*`. Copy is locked in UI-SPEC `02-UI-SPEC.md`. No MDX needed — prose is limited and inline `<h1>/<h2>/<p>` is clearer. |
| GEO-04 | ToS includes Georgia non-residency clause | Exact copy locked in UI-SPEC Section `/legal/tos` Section 3. Research adds no new prescription — just verify the locked copy appears verbatim in the rendered page. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack (locked):** Next.js 16.2.x App Router + React 19.2 + Supabase (Auth + Postgres 17 + Storage + Edge Functions) + Vercel + Resend + PostHog
- **Package manager:** pnpm (≥10 per lockfile; Phase 1 CI fix) — never npm install lockfile-changing commands
- **Runtime:** Node 20 LTS
- **Node engine (in package.json):** `>=20.0.0`; pnpm `>=10.0.0`
- **No `@supabase/auth-helpers-nextjs`** — deprecated, must stay uninstalled
- **No `supabase.auth.getSession()` on any server path** — always `getClaims()` (primary) or `getUser()` (fallback)
- **No raw `tailwind.config.js`** — v4 is CSS-first via `@theme` in `app/globals.css`
- **No `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` prefix** — service-role key is server-only
- **Forms: React Hook Form + Zod + @hookform/resolvers** (STACK.md Supporting Libraries)
- **Branding:** sage/forest/clay palette (locked); Lora/Inter fonts (locked); `hello@barterkin.com` is the SMTP from-address
- **CI pipeline (6 checks) must stay green:** lint, typecheck, unit test, E2E test, build, gitleaks
- **`.env.local` is gitignored; `.env.local.example` is checked in** (Phase 1 established)
- **CLAUDE.md gstack section:** GSD workflow enforcement — all file edits via GSD commands
- **Repo is PUBLIC** — any secret with `NEXT_PUBLIC_` is browser-readable (already understood)

## Standard Stack

### Core (already installed in Phase 1 — re-validate versions only)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | `0.10.2` (installed) | Three-client factory (browser, server, middleware); PKCE flow by default | The only sanctioned Supabase + Next.js App Router wiring. `@supabase/auth-helpers-nextjs` is deprecated. [VERIFIED: npm registry 2026-04-19] |
| `@supabase/supabase-js` | `2.103.3` (installed) | Underlying auth + data client | Latest stable. Past the v2.91.0 `exchangeCodeForSession` setTimeout bug (fixed by Jan 2026 per GitHub issue #2037 closure). [VERIFIED: npm registry + GitHub issue state=closed] |
| `next` | `16.2.4` (installed) | App Router, middleware, server actions, route handlers | Phase 1 locked. |
| `react` | `19.2.4` (installed) | UI runtime | Phase 1 locked. |
| `shadcn` | `4.3.0` (installed CLI) | Component system, new-york style, Tailwind v4 mode | Phase 1 initialized; Phase 2 adds Form, Alert, Separator. |

### New additions in Phase 2

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@marsidev/react-turnstile` | `1.5.0` (published 2026-03-28, 3 weeks before research) | React wrapper for Cloudflare Turnstile widget | Most-maintained React wrapper. MIT license, no deps, 68KB unpacked. UI-SPEC already locks this choice. [VERIFIED: npm registry 2026-04-19] |
| `disposable-email-domains-js` | `1.24.0` (published 2026-03-15, weekly auto-update via GitHub Actions) | Checks an email domain against a ~4000-domain blocklist | Weekly updates (compared to `disposable-email-domains@1.0.62` which was last published 2022-09-28 and is stale). CC0-1.0 license, no deps, 112KB. [VERIFIED: npm registry 2026-04-19] |
| `react-hook-form` | `7.72.1` (install) | Client form state for email input | STACK.md canonical. Pair with Zod resolver. [VERIFIED: npm registry 2026-04-19] |
| `@hookform/resolvers` | `5.2.2` (install) | Zod ↔ RHF adapter | Resolvers v5 is the Zod-4-compatible line. [VERIFIED: npm registry 2026-04-19] |
| `zod` | `4.3.6` (install) | Schema validation for email input + disposable-domain check | STACK.md canonical. Zod 4 is stable. [VERIFIED: npm registry 2026-04-19] |

### Supporting (already installed)

| Library | Version | Used For |
|---------|---------|----------|
| `lucide-react` | `1.8.0` (installed) | `LogOut`, `AlertCircle`, `Loader2` icons in UI-SPEC |
| `@vercel/analytics` | `2.0.1` (installed) | Page-view analytics already wired in root layout |
| `posthog-js` / `posthog-node` | `1.x` / `5.x` (installed) | Not used in Phase 2 for metrics (no `contact_initiated` equivalent); may capture `signup_completed` if trivial |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `disposable-email-domains-js` (weekly updates) | `disposable-email-domains` v1.0.62 | **Use new package** — original is stale (last update 2022-09-28); fork has weekly auto-updates. [VERIFIED: npm registry modified timestamps] |
| Postgres `signup_attempts` counter | Upstash Redis `@upstash/ratelimit` | Redis = sub-ms, Postgres = 5–50ms. Upstash free tier (500k commands/month [CITED: upstash.com/pricing]) is sufficient but adds a vendor + a second system of record. Postgres wins for solo-builder simplicity. |
| Supabase-native CAPTCHA (pass `captchaToken` in options) | Custom Edge Function verifying via `/siteverify` then calling signInWithOtp | Supabase-native = fewer moving parts, Studio-configured secret. Custom Edge Function only pays off if CAPTCHA will also protect non-auth endpoints. Not needed Phase 2. [CITED: supabase.com/docs/guides/auth/auth-captcha] |
| `@marsidev/react-turnstile` | `react-turnstile` (older) or hand-rolled Turnstile script loader | UI-SPEC already locks `@marsidev/react-turnstile` — most-maintained, typed, React-19-compatible, 3-weeks-fresh as of research. |
| Two routes (`/auth/callback` + `/auth/confirm`) | One consolidated route that branches on query param shape | Two routes = clearer intent, easier to test. Consolidation is a footgun (different Supabase methods, different error shapes). |

### Installation

```bash
pnpm add react-hook-form @hookform/resolvers zod @marsidev/react-turnstile disposable-email-domains-js
pnpm dlx shadcn@latest add form alert separator
```

### Version verification

All versions above were verified against npm registry on 2026-04-19 via `npm view <package> version` and `npm view <package> time.modified`. No training-data version guesses; every version is current within 35 days or flagged as such.

---

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          UNAUTHENTICATED USER (Browser)                     │
└──────────────────────────────┬─────────────────────────────────────────────┘
                               │
                               │ GET /signup or /login
                               ▼
                ┌──────────────────────────────────┐
                │  app/(auth)/{login,signup}/page  │  ← shadcn Form + Input
                │  Server component                │  + Turnstile widget
                │  Renders OAuth button + magic-   │  + legal microcopy
                │  link form                       │
                └──────┬───────────────────────────┘
                       │
         ┌─────────────┼──────────────────┐
         │             │                  │
         ▼ (Google)    ▼ (magic link)     ▼ (cross-link to /login or /signup)
  ┌─────────────┐  ┌─────────────────┐
  │ Google      │  │ Server Action   │
  │ Consent     │  │ sendMagicLink() │
  │ Screen      │  │ ────────────────│
  │ (Supabase-  │  │ 1. Zod-parse    │
  │ configured) │  │ 2. Check block- │
  │             │  │    list         │
  └──────┬──────┘  │ 3. Check IP     │
         │         │    counter      │
         │         │ 4. signInWithOtp│
         │         │    with capToken│
         │         └───────┬─────────┘
         │                 │
         │                 ▼
         │         ┌──────────────────┐       ┌───────────────┐
         │         │  Supabase Auth   │──────▶│ Cloudflare    │
         │         │  (Studio-config- │       │ /siteverify   │
         │         │   ured Turnstile)│◀──────│ (server-side) │
         │         └────────┬─────────┘       └───────────────┘
         │                  │
         │                  ▼
         │         ┌──────────────────┐       ┌───────────────┐
         │         │  Resend SMTP     │──────▶│ User's Inbox  │
         │         │  (Phase 1 wired) │       │ (magic link)  │
         │         └──────────────────┘       └──────┬────────┘
         │                                           │
         │                                           │ user clicks link
         ▼                                           ▼
  ┌───────────────────────────┐              ┌───────────────────────────┐
  │ GET /auth/callback?code=  │              │ GET /auth/confirm         │
  │  (Supabase sends user     │              │  ?token_hash=&type=email  │
  │   back here after consent)│              │                            │
  │ ─────────────────────────│              │ ─────────────────────────│
  │ Route handler:            │              │ Route handler:            │
  │ exchangeCodeForSession()  │              │ verifyOtp({token_hash,    │
  │ → session cookies set     │              │           type})          │
  │ → redirect(next)          │              │ → session cookies set     │
  └────────┬──────────────────┘              │ → redirect(next)          │
           │                                 └────────┬──────────────────┘
           │                                          │
           └────────────────┬─────────────────────────┘
                            │
                            ▼
           ┌────────────────────────────────────────┐
           │        Next.js middleware.ts           │
           │ ────────────────────────────────────── │
           │ On every request:                      │
           │ 1. getClaims() — refresh session       │
           │ 2. IF path in (auth) group AND authed  │
           │    → redirect to /directory            │
           │ 3. IF path protected AND unverified    │
           │    → redirect to /verify-pending       │
           └────────────────┬───────────────────────┘
                            │
                            ▼
           ┌────────────────────────────────────────┐
           │           Authed surfaces              │
           │  (Phase 3+: /profile, /directory, ...) │
           │  Email-verify gated by RLS too:        │
           │  directory_read policy checks          │
           │  email_confirmed_at IS NOT NULL        │
           └────────────────────────────────────────┘
```

### Recommended Project Structure (Phase 2 additions)

```
app/
├── (auth)/                          # NEW — route group, no URL prefix
│   ├── login/page.tsx               # NEW — shadcn Form, OAuth + magic link
│   └── signup/page.tsx              # NEW — same structure, different copy
├── auth/                            # NEW — route handlers only, no pages
│   ├── callback/route.ts            # NEW — OAuth code → session
│   ├── confirm/route.ts             # NEW — magic-link token_hash → session
│   ├── signout/route.ts             # NEW — POST-only, clears cookies
│   └── error/page.tsx               # NEW — fallback for verify/exchange errors
├── legal/                           # NEW — static prose pages
│   ├── tos/page.tsx                 # NEW — GEO-04 non-residency clause
│   ├── privacy/page.tsx             # NEW
│   └── guidelines/page.tsx          # NEW
├── verify-pending/page.tsx          # NEW — post-signup gate
├── layout.tsx                       # EDIT — add <Footer> component
└── globals.css                      # EDIT — add @theme inline brand overrides

components/
├── ui/                              # existing shadcn
│   ├── form.tsx                     # NEW (via `shadcn add form`)
│   ├── alert.tsx                    # NEW (via `shadcn add alert`)
│   └── separator.tsx                # NEW (via `shadcn add separator`)
├── auth/                            # NEW — Phase 2 local components
│   ├── google-oauth-button.tsx      # NEW — client component, signInWithOAuth
│   ├── magic-link-form.tsx          # NEW — client component, RHF + Zod + Turnstile
│   ├── turnstile-widget.tsx         # NEW — @marsidev/react-turnstile wrapper
│   ├── logout-button.tsx            # NEW — POSTs to /auth/signout
│   └── magic-link-confirmation.tsx  # NEW — post-submit "Check your email" state
├── legal-layout.tsx                 # NEW — shared prose container
└── footer.tsx                       # NEW — spans all routes, legal links + logout

lib/
├── auth/                            # NEW — server-only auth helpers
│   ├── disposable-email.ts          # NEW — wraps disposable-email-domains-js
│   ├── rate-limit.ts                # NEW — reads x-forwarded-for, checks signup_attempts
│   └── actions.ts                   # NEW — sendMagicLink, signInWithGoogle server actions
├── supabase/                        # existing
│   ├── client.ts                    # existing
│   ├── server.ts                    # existing
│   ├── middleware.ts                # EDIT — extend with route-gating + email-verify
│   └── admin.ts                     # existing (not used in Phase 2)
└── database.types.ts                # REGEN after migration — pnpm supabase gen types

middleware.ts                        # EDIT — no logic change; matcher already correct

supabase/
├── migrations/
│   └── {timestamp}_phase2_auth.sql  # NEW — signup_attempts table + RLS policies
│                                    # + handle_new_user trigger (profile stub for Phase 3)
└── config.toml                      # existing

tests/
├── unit/
│   ├── disposable-email.test.ts     # NEW
│   ├── rate-limit.test.ts           # NEW
│   └── magic-link-schema.test.ts    # NEW (Zod schema)
└── e2e/
    ├── login-magic-link.spec.ts     # NEW — signInWithOtp mock + /auth/confirm roundtrip
    ├── login-google-oauth.spec.ts   # NEW — redirect stub
    ├── verify-pending-gate.spec.ts  # NEW — unverified user blocked from /directory
    ├── logout.spec.ts               # NEW
    ├── legal-pages.spec.ts          # NEW — all three render, GEO-04 clause present
    └── footer-links.spec.ts         # NEW
```

### Pattern 1: `/auth/callback/route.ts` — OAuth code exchange

**What:** Server-side route handler that accepts the OAuth `?code=` query param from Supabase's redirect and exchanges it for a session.

**When to use:** For Google OAuth (AUTH-01). Supabase Auth redirects the user to this route after Google consent.

**Example (adapted from community + Supabase patterns; verified as the standard for `@supabase/ssr` 0.10.x):**

```ts
// app/auth/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/directory'
  const next = nextParam.startsWith('/') ? nextParam : '/directory'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error?reason=exchange_failed`)
}
```

**Source:** `github.com/SamuelSackey/nextjs-supabase-example/blob/main/src/app/auth/callback/route.ts` + Supabase PKCE flow docs. [CITED: supabase.com/docs/guides/auth/sessions/pkce-flow]

**Critical:** The `@supabase/auth-js@2.103.3` version shipped with our `supabase-js` is AFTER the v2.91.0 `setTimeout` deferral bug was fixed (GitHub issue #2037, closed 2026-01-21). No workaround needed. [VERIFIED: GitHub issue 2037 state=closed + npm registry version]

### Pattern 2: `/auth/confirm/route.ts` — magic-link token verification

**What:** Server-side route handler that accepts the magic-link `?token_hash=&type=email` query params and calls `verifyOtp` to create a session.

**When to use:** For email magic-link (AUTH-02) via PKCE flow.

**Example (verbatim from Supabase UI docs and community guides):**

```ts
// app/auth/confirm/route.ts
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const _next = searchParams.get('next')
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

**Source:** [CITED: supabase.com/ui/docs/nextjs/password-based-auth] — verbatim pattern, confirmed across multiple community guides (ryankatayi.com blog).

### Pattern 3: Magic-link send server action with Turnstile + blocklist + rate limit

**What:** Server action invoked from the `/login` or `/signup` form. Validates, checks blocklist, checks IP rate limit, then calls `signInWithOtp` with the Turnstile token.

**When to use:** For the magic-link path (AUTH-02, AUTH-06, AUTH-07, AUTH-08).

**Example (prescriptive — compose from verified primitives):**

```ts
// lib/auth/actions.ts
'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isDisposableEmail } from '@/lib/auth/disposable-email'
import { checkAndIncrementIpCounter } from '@/lib/auth/rate-limit'

const MagicLinkSchema = z.object({
  email: z.string().email().toLowerCase(),
  captchaToken: z.string().min(1),
})

export async function sendMagicLink(
  _prevState: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = MagicLinkSchema.safeParse({
    email: formData.get('email'),
    captchaToken: formData.get('cf-turnstile-response'),
  })
  if (!parsed.success) {
    return { ok: false, error: 'Please enter a valid email.' }
  }

  // AUTH-07: reject disposable-email domains
  if (await isDisposableEmail(parsed.data.email)) {
    return {
      ok: false,
      error: "That email provider isn't supported. Please use a personal email.",
    }
  }

  // AUTH-06: per-IP rate limit (5/day)
  const hdrs = await headers()
  const ip = (hdrs.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  const underLimit = await checkAndIncrementIpCounter(ip)
  if (!underLimit) {
    return { ok: false, error: 'Too many signups from this network today.' }
  }

  // AUTH-02 + AUTH-08: signInWithOtp with Turnstile token passed to Supabase Auth
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      captchaToken: parsed.data.captchaToken,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      shouldCreateUser: true,
    },
  })
  if (error) {
    return { ok: false, error: 'Something went wrong. Please try again in a moment.' }
  }

  return { ok: true }
}
```

**Notes:**
- `formData.get('cf-turnstile-response')` is the Turnstile widget's standard form field name.
- `captchaToken` is passed directly to `supabase.auth.signInWithOtp` — Supabase Auth server calls Cloudflare `/siteverify` internally (no Next-side verification needed). [CITED: supabase.com/docs/guides/auth/auth-captcha — confirms `options: { captchaToken }` pattern for `signUp`; signInWithOtp accepts the same shape per API reference]
- The Turnstile secret lives in Supabase Studio → Auth → Bot and Abuse Protection, NOT in `.env.local`. Only the sitekey (`NEXT_PUBLIC_TURNSTILE_SITEKEY`) is in the app environment.

### Pattern 4: Google OAuth sign-in (client-side, triggers redirect)

**What:** Client component that calls `signInWithOAuth({ provider: 'google' })` with the Turnstile token and callback URL.

**When to use:** For Google OAuth (AUTH-01).

**Example:**

```tsx
// components/auth/google-oauth-button.tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function GoogleOAuthButton({ captchaToken }: { captchaToken: string | null }) {
  async function signIn() {
    if (!captchaToken) return
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        captchaToken,
        redirectTo: `${window.location.origin}/auth/callback?next=/directory`,
      },
    })
    // signInWithOAuth initiates a redirect; no further code runs here.
  }

  return (
    <Button size="lg" onClick={signIn} disabled={!captchaToken}>
      Continue with Google
    </Button>
  )
}
```

**Notes:**
- Supabase config: Studio → Auth → Providers → Google. Client ID + secret from Google Cloud Console. Authorized redirect URI = `https://hfdcsickergdcdvejbcw.supabase.co/auth/v1/callback`. Authorized JavaScript origins = `http://localhost:3000`, `https://barterkin.com`, and each Vercel preview origin (add a wildcard pattern `https://*-{vercel-team}.vercel.app`).
- Studio → Auth → URL Configuration: add site URL + additional redirect URLs: `http://localhost:3000/**`, `https://*-{vercel-team}.vercel.app/**`, `https://barterkin.com/**`.

### Pattern 5: Email-verify gate in RLS

**What:** Postgres RLS policy that hides unverified users' profiles from the directory.

**When to use:** For AUTH-04 (and by extension DIR-09, PROF-13 in later phases — this policy is introduced in Phase 2 for enforcement, then profile tables consume it in Phase 3).

**Example:**

```sql
-- Phase 2 migration: supabase/migrations/{timestamp}_phase2_auth.sql
-- This migration creates the rate-limit table and installs the email-verify
-- enforcement function. Profile tables are created in Phase 3.

-- Rate limit table (AUTH-06)
create table public.signup_attempts (
  ip text not null,
  day date not null default current_date,
  count int not null default 0,
  created_at timestamptz not null default now(),
  primary key (ip, day)
);

-- Service-role-only access (no RLS exposure)
alter table public.signup_attempts enable row level security;
-- Intentionally NO policies. Only service-role (via Postgres function or edge
-- function) can read/write. The server action calls a SECURITY DEFINER function
-- that increments and returns whether under-limit.

create or replace function public.check_signup_ip(p_ip text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_count int;
begin
  -- Prune old rows opportunistically (keep 7-day window)
  delete from public.signup_attempts where day < current_date - interval '7 days';

  insert into public.signup_attempts (ip, day, count)
  values (p_ip, current_date, 1)
  on conflict (ip, day) do update set count = public.signup_attempts.count + 1
  returning count into current_count;

  return current_count <= 5;
end;
$$;

-- Anon and authenticated roles can call it; SECURITY DEFINER lets it write to signup_attempts
grant execute on function public.check_signup_ip(text) to anon, authenticated;

-- Email-verify reusable helper (AUTH-04)
-- Phase 3's directory_read policy will call this predicate.
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

-- Disposable-email domain trigger (AUTH-07 defense-in-depth for OAuth bypass)
-- Checks the email at INSERT time; if it matches the blocklist (loaded from
-- a seeded table), the trigger raises an exception, which causes Supabase Auth
-- to reject the signup.
create table public.disposable_email_domains (
  domain text primary key
);

-- Seed from disposable-email-domains-js at migration time via psql \copy or
-- a separate seed.sql. Re-seed quarterly via a cron or manual task.
-- (The canonical list is a JSON array; convert to one-domain-per-line CSV.)

create or replace function public.reject_disposable_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  email_domain text;
begin
  email_domain := lower(split_part(new.email, '@', 2));
  if exists (select 1 from public.disposable_email_domains where domain = email_domain) then
    raise exception 'Disposable email domain rejected: %', email_domain
      using errcode = '23514'; -- check_violation
  end if;
  return new;
end;
$$;

create trigger reject_disposable_email_before_insert
  before insert on auth.users
  for each row execute function public.reject_disposable_email();
```

**Notes:**
- `auth.users` is in the `auth` schema owned by `supabase_auth_admin`. Installing a trigger on it requires the `postgres` superuser (local dev + migration deploy). [CITED: supabase.com discussion #34518 — confirms `postgres` role can still install triggers on `auth.users` despite RLS changes]
- The trigger is `SECURITY DEFINER` and sets `search_path = public, pg_temp` to prevent search-path hijack — standard security hardening.
- The rate-limit table `signup_attempts` has RLS enabled with NO policies. Anon and authenticated cannot read or write directly; only the `SECURITY DEFINER` function `check_signup_ip` can mutate it. This is the correct pattern for "table exists but is service-role only."

### Pattern 6: Middleware route-gating

**What:** Extend the existing middleware to (a) redirect authed users away from `(auth)` group pages, and (b) redirect unverified users to `/verify-pending`.

**When to use:** For AUTH-09 (auth-page redirect) and AUTH-04 (email-verify middleware gate — UX layer on top of the RLS trust boundary).

**Example (extends the Phase 1 middleware):**

```ts
// lib/supabase/middleware.ts (MODIFIED — extends existing)
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

const AUTH_GROUP_PATHS = ['/login', '/signup']
const PUBLIC_PATHS = [
  '/', '/legal/tos', '/legal/privacy', '/legal/guidelines',
  '/verify-pending', '/auth/callback', '/auth/confirm',
  '/auth/signout', '/auth/error',
]
const VERIFIED_REQUIRED_PREFIXES = ['/directory', '/m/', '/profile']

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

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const isAuthed = !!claims?.sub
  const isVerified = !!claims?.email && !!claims?.email_verified
    // Supabase JWT contains `email` and `email_verified` claims when email_confirmed_at is set.
    // (SEE OPEN QUESTION #1 — may need to supplement with auth.users lookup in edge cases.)

  const pathname = request.nextUrl.pathname

  // AUTH-09: authed users redirected away from /login and /signup
  if (isAuthed && AUTH_GROUP_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/directory', request.url))
  }

  // AUTH-04: unverified users redirected to /verify-pending for protected routes
  if (
    isAuthed && !isVerified
    && VERIFIED_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.redirect(new URL('/verify-pending', request.url))
  }

  return response
}
```

**Notes:**
- `getClaims()` returns JWT claims including `sub`, `email`, `email_verified`. (Supabase puts `email_verified: true` in the JWT when `email_confirmed_at` is non-null.) Confirmed by Supabase JWT claims reference. [CITED: supabase.com/docs/guides/auth/jwt-fields]
- For Phase 2, the `VERIFIED_REQUIRED_PREFIXES` list is aspirational — `/directory`, `/m/*`, `/profile` pages don't yet exist. The middleware check still runs; it's just a no-op until Phase 3/4. This is the correct order: install the gate first, then add gated pages.

### Pattern 7: Disposable-email check helper

```ts
// lib/auth/disposable-email.ts
import 'server-only'
import { DisposableEmailChecker } from 'disposable-email-domains-js'

const checker = new DisposableEmailChecker()

export async function isDisposableEmail(email: string): Promise<boolean> {
  const domain = email.trim().toLowerCase().split('@')[1]
  if (!domain) return false
  return checker.isDisposable(domain)
}
```

**Notes:**
- `disposable-email-domains-js` exports a class; instantiate once at module scope.
- Import path verified at install time (`import { DisposableEmailChecker } from 'disposable-email-domains-js'` per the npm readme). If the export shape differs in 1.24.0, adjust to the actual API.
- `server-only` import keeps the ~4000-domain list out of the client bundle (~110KB saved).

### Pattern 8: Turnstile widget wrapper

```tsx
// components/auth/turnstile-widget.tsx
'use client'
import { Turnstile } from '@marsidev/react-turnstile'

export function TurnstileWidget({
  onVerify,
}: {
  onVerify: (token: string) => void
}) {
  return (
    <div className="flex justify-center my-4">
      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY!}
        onSuccess={onVerify}
        options={{
          theme: 'light',
          action: 'signup',
        }}
      />
    </div>
  )
}
```

**Notes:**
- Token expires ~5 minutes after issue; the widget auto-refreshes on expire.
- `siteKey` is a PUBLIC value — safe to expose with `NEXT_PUBLIC_` prefix.
- Secret lives in Supabase Studio (not in .env.local) for the auth path.

### Anti-Patterns to Avoid

- **Do not call Cloudflare `/siteverify` from the Next.js server action AND pass `captchaToken` to Supabase.** Verify once. Supabase's native integration calls `/siteverify` server-side; adding your own call doubles the request and makes the token single-use (second call will fail).
- **Do not consolidate `/auth/callback` and `/auth/confirm` into one route.** They handle different token shapes (`code` vs `token_hash + type`) and call different Supabase methods (`exchangeCodeForSession` vs `verifyOtp`). Branching on query-param presence is a footgun.
- **Do not use `getSession()` anywhere on the server.** Already banned in CLAUDE.md and PITFALLS.md Pitfall 1; repeating because it's the most common break.
- **Do not store the Turnstile secret in `.env.local`.** The auth path secret lives in Supabase Studio. Adding it to `.env.local` implies "used by Next.js code," which is wrong for this phase.
- **Do not trust `email_verified` from `user_metadata`.** `user_metadata` is user-writable (PITFALLS.md Pitfall 11-analogous). The `email_verified` at the top level of the JWT comes from `auth.users.email_confirmed_at` and is trustworthy. `user_metadata.email_verified` is not.
- **Do not insert profile rows from the client.** Create an `AFTER INSERT ON auth.users` trigger (Phase 3 concern, but Phase 2 can lay the pattern). PITFALLS.md Pitfall 6.
- **Do not hardcode the site URL in OAuth redirectTo.** Use `NEXT_PUBLIC_SITE_URL` or `window.location.origin` (client) / `request.url`'s origin (server). Hardcoded URLs break Vercel preview deploys.
- **Do not swallow errors in the middleware.** PITFALLS.md Pitfall 4 — silent cookie-set failures are the #1 root cause of "works in dev, breaks in prod" auth bugs.
- **Do not put logout behind a confirm dialog.** UI-SPEC locks this: "No confirmation dialog. Logout is reversible in 10 seconds."

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth PKCE flow | Custom code-verifier + code-challenge + exchange | `@supabase/ssr` PKCE default | Cookie handling, verifier storage, and redirect URL validation are all security-critical and already solved. |
| JWT signature verification | Manual `jose`/`jsonwebtoken` verify | `supabase.auth.getClaims()` (JWKS-verified) | Already wired. Hand-rolling is how you accidentally use HS256 and accept a forged token. |
| Session cookie refresh | Manual cookie parsing + setter | `@supabase/ssr` middleware `updateSession` | Already wired. Re-implementing breaks when Supabase rotates its cookie schema (happened in 2025). |
| CAPTCHA verification | Your own `/api/turnstile` route that calls `/siteverify` | Pass `captchaToken` to `signInWithOtp`/`signInWithOAuth` options | Supabase Auth server does it natively — fewer moving parts, no single-use-token race. |
| Disposable-email detection | Your own list + regex | `disposable-email-domains-js@1.24.0` | 4000+ domains, weekly auto-update via GitHub Actions. Your hand-rolled list goes stale in a month. |
| Rate-limit data structure | In-memory Map, bespoke leaky-bucket | Postgres table with `SECURITY DEFINER` function | Solo-builder on free tier; Postgres is already the source of truth; in-memory loses state across serverless invocations. |
| Magic-link email templates | Hand-authored HTML | Supabase Studio → Auth → Email Templates (already Resend-backed in Phase 1) | Templates are Studio-configured and already branded. Editing is a Studio task, not a code task. |
| Google OAuth state param | Custom CSRF token | `@supabase/ssr` + Supabase Auth server | Handled natively. |
| Email-domain extraction | `email.split('@')[1]` | Same — but wrap it in a helper with unicode normalization | The simple split is fine; wrap for consistency across callers. |
| "Tap share → Add to Home Screen" iOS PWA install instructions | Custom sniffing code | Borrow a vetted snippet (Phase 6 concern, not Phase 2) | Out of scope here; flagged so planner doesn't drift. |
| Cookie parsing in middleware | Manual header split | `@supabase/ssr` cookie adapter | Already wired. |

**Key insight:** For a solo-builder on free tier, the right answer for every auth primitive is "use what Supabase gives you." The only hand-rolled code in Phase 2 is (a) the disposable-email wrapper, (b) the rate-limit helper, and (c) the route-gating middleware extension. Everything else is configuration + known-good code paste.

---

## Runtime State Inventory

*Not applicable — Phase 2 is greenfield (no rename, refactor, migration). All state is new: `signup_attempts` table, `disposable_email_domains` seed table, auth route handlers, and legal pages.*

---

## Common Pitfalls

### Pitfall 1: `exchangeCodeForSession` deferred `SIGNED_IN` event (v2.91.0 regression)
**What goes wrong:** OAuth callback returns 302 but no session cookie is set. User lands back on `/login`.
**Why it happens:** `@supabase/supabase-js@2.91.0` introduced `setTimeout(..., 0)` around `_notifyAllSubscribers('SIGNED_IN', ...)` inside `exchangeCodeForSession`, deferring the SSR cookie-writing callback past the serverless response.
**Status:** Fixed. Our installed version `@supabase/auth-js@2.103.3` is 12 minor versions past the bug and the upstream issue (#2037) closed 2026-01-21. [VERIFIED: GitHub issue state + npm registry version]
**How to avoid:** Keep `@supabase/supabase-js` at `^2.103.3` or higher. Do NOT pin to `2.91.x`–`2.92.x`.
**Warning signs:** Successful OAuth redirect but user appears unauthenticated. Check `@supabase/supabase-js` version first.

### Pitfall 2: Turnstile double-verification
**What goes wrong:** Turnstile tokens are single-use. If you verify the token in your Next.js server action AND pass it to `signInWithOtp`, Supabase's subsequent `/siteverify` call fails (token already consumed).
**Why it happens:** Developer sees the Supabase Edge Function example that calls `/siteverify` and assumes the same call is needed in Next.js.
**How to avoid:** For auth paths, pass `captchaToken` directly to Supabase (it verifies once). Only call `/siteverify` yourself for non-auth forms (none in Phase 2).
**Warning signs:** `captchaToken already consumed` or `invalid token` errors even when the widget succeeds.

### Pitfall 3: Middleware cookie handling (Phase 1 already solved, but reinforce)
**What goes wrong:** Cookies set in `NextResponse.next({ request })` are lost when the response object is reassigned without propagating the `Set-Cookie` header.
**Why it happens:** Copy-paste bugs where `let response` is reassigned mid-handler.
**How to avoid:** The Phase 1 `lib/supabase/middleware.ts` pattern is correct — don't rewrite it. When extending with route-gating, always `return response` (the most recent reassignment) and never a fresh `NextResponse.next()` without re-attaching cookies. Redirects (`NextResponse.redirect`) inherit cookies from the request, not the response — if the redirect path needs a cookie change, set it on the redirect response explicitly.
**Warning signs:** "Logged in briefly, logged out after refresh." Sessions that survive 59 minutes and break at the 1-hour JWT refresh boundary.

### Pitfall 4: Missing `email_verified` in JWT for legacy providers (OAuth edge case)
**What goes wrong:** User signs in with Google, `auth.users.email_confirmed_at` is set (Google verified the email), but the JWT's `email_verified` claim is false or missing. Middleware redirects to `/verify-pending` even though the user is verified.
**Why it happens:** Known Supabase issue #1620 — the identities table's `email_verified` is sometimes not updated during social login flows. [CITED: github.com/supabase/auth/issues/1620]
**How to avoid:** In the middleware email-verify check, fall back to a direct `supabase.auth.getUser()` lookup when `email_verified` is missing from the claims — `getUser()` hits the Auth server and returns the full `email_confirmed_at`. Trade-off: one extra round-trip in a narrow edge case; acceptable.
**Warning signs:** Google-authed users stuck on `/verify-pending` despite being verified. QA: create a Google account, sign in, check if `/directory` loads.

### Pitfall 5: IP extraction from `x-forwarded-for` behind Vercel
**What goes wrong:** Rate-limit counts ALL users as "IP 1.2.3.4" because `request.ip` is unreliable or `x-forwarded-for` contains a trust-chain you didn't parse.
**Why it happens:** Vercel's edge sends `x-forwarded-for: <client>, <vercel-edge>`. Taking the whole string keys all users to the same bucket; taking the last entry keys all users to the edge IP.
**How to avoid:** `const ip = (headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'`. Always take the FIRST entry (the original client IP). Vercel docs confirm this. [CITED: vercel.com/docs/edge-network/headers#x-forwarded-for]
**Warning signs:** Rate limit rejects the first user of the day, or every user has the same IP in logs.

### Pitfall 6: Trigger on `auth.users` blocks signup silently
**What goes wrong:** The `reject_disposable_email` trigger raises an exception, but Supabase Auth surfaces a generic "Database error" instead of the specific message. User sees "Something went wrong."
**Why it happens:** Supabase Auth wraps Postgres exceptions in its own error response.
**How to avoid:** (a) Do the disposable-email check in the server action FIRST so the friendly error surfaces. The trigger is defense-in-depth for OAuth only — OAuth doesn't flow through the server action, so triggers catch OAuth-domain bypasses. (b) Test both paths in Playwright: magic-link @mailinator.com (server action rejects, friendly error), and OAuth with a domain not pre-checkable (trigger rejects, less-friendly "signup failed").
**Warning signs:** Generic "signup failed" for @mailinator.com attempts — means the server-action check was skipped.

### Pitfall 7: OAuth `redirectTo` mismatch across environments
**What goes wrong:** Production redirects work but Vercel preview redirects fail with "Invalid redirect URL."
**Why it happens:** Supabase Studio → Auth → URL Configuration doesn't have the preview URL pattern in the allowlist.
**How to avoid:** Add `http://localhost:3000/**`, `https://*-{vercel-team}.vercel.app/**`, and `https://barterkin.com/**` to the redirect URL allowlist. Double asterisks (`/**`) match any path; required for the callback route.
**Warning signs:** Local works, preview fails. Errors like `redirect_uri_mismatch` in browser console after Google consent.

### Pitfall 8: `/auth/signout` behind GET
**What goes wrong:** Prefetch or accidental nav fires logout.
**Why it happens:** Next.js link prefetching + GET-based signout = random signouts when the logout link is hovered.
**How to avoid:** Make `/auth/signout` a POST-only handler. Logout button submits a `<form method="POST">` or uses a server action that calls `supabase.auth.signOut()` then redirects.
**Warning signs:** "I got logged out when I didn't click anything."

### Pitfall 9: Magic-link `emailRedirectTo` not matching `/auth/confirm`
**What goes wrong:** User clicks magic link, lands on a blank page or home page; no session created.
**Why it happens:** Supabase's default magic-link email template uses a hash-fragment URL (`#access_token=...`) unless the PKCE flow is active. With PKCE (default in `@supabase/ssr`), the URL is `{emailRedirectTo}?token_hash=...&type=email`.
**How to avoid:** Set `emailRedirectTo: '${NEXT_PUBLIC_SITE_URL}/auth/confirm'` in `signInWithOtp` options. Ensure the email template in Supabase Studio uses `{{ .ConfirmationURL }}` (the PKCE-aware variable), not the legacy hash-fragment pattern.
**Warning signs:** Magic link opens a page with no visible auth state; browser URL contains `?token_hash=...` but nothing happens.

### Pitfall 10: Bot waves bypass rate limit by rotating IPs
**What goes wrong:** Sophisticated attackers use residential proxy networks — every signup comes from a fresh IP; per-IP limit never trips.
**Why it happens:** 5/IP/day is a per-IP limit; an attacker with 10k proxies can make 50k signups.
**How to avoid:** Turnstile is the primary defense against this; per-IP limit is secondary. The UI-SPEC already requires Turnstile on every submit. Known cost: Turnstile is effective against bots but has false-positive friction for legitimate users on VPNs — keep the error copy friendly (already done in UI-SPEC).
**Warning signs:** Signup spike with legitimate-looking emails (not @mailinator.com), geographically distributed IPs. Mitigation: bump the IP counter to 3/day and add a per-ASN counter as Phase-6 followup.
**Phase to address:** Ack during Phase 2 planning; fallback mitigation if bots still get through post-launch (out of scope for v1).

---

## Code Examples

(See `## Architecture Patterns` for verified code patterns. Each code block is sourced from official Supabase docs, Supabase UI docs, or verified community examples. Summary of code files to produce in Phase 2:)

| File | Pattern | Source |
|------|---------|--------|
| `app/auth/callback/route.ts` | Pattern 1 — OAuth code exchange | Supabase UI docs + SamuelSackey community example |
| `app/auth/confirm/route.ts` | Pattern 2 — verifyOtp (magic-link) | Supabase UI docs (verbatim) |
| `app/auth/signout/route.ts` | POST handler calling `supabase.auth.signOut()` | Community pattern |
| `lib/auth/actions.ts` — `sendMagicLink` | Pattern 3 — server action with Turnstile + blocklist + rate limit | Composed from verified primitives |
| `components/auth/google-oauth-button.tsx` | Pattern 4 — client signInWithOAuth | Supabase social-login docs |
| `supabase/migrations/{timestamp}_phase2_auth.sql` | Pattern 5 — RLS + triggers + rate-limit function | Composed from Supabase auth + PITFALLS patterns |
| `lib/supabase/middleware.ts` (extend) | Pattern 6 — route-gating | Extends Phase 1 Supabase-SSR middleware |
| `lib/auth/disposable-email.ts` | Pattern 7 — disposable-email-domains-js wrapper | npm readme API |
| `components/auth/turnstile-widget.tsx` | Pattern 8 — Turnstile widget | @marsidev/react-turnstile readme |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023-2024 migration, auth-helpers frozen at v0.15.0 | Don't touch `auth-helpers`. Use `ssr`. |
| `getSession()` on server | `getClaims()` (primary) / `getUser()` (fallback) | `getClaims()` added late-2024, probed available on 0.10.2 | Already wired in middleware. |
| Magic link via URL hash fragment | Magic link via PKCE `token_hash` + `/auth/confirm` | PKCE default in `@supabase/ssr` | Use `emailRedirectTo: '/auth/confirm'` + server-side `verifyOtp`. |
| Manual Turnstile `/siteverify` call | `captchaToken` in `signInWithOtp` options | Supabase native integration, late-2024 | Don't double-verify. |
| `exchangeCodeForSession` with setTimeout deferral bug | Fixed in >= 2.92.x | 2026-01-21 (issue #2037 closed) | Our 2.103.3 is safe. |
| Per-IP rate limit via Redis | Postgres counter for solo-builder scale | N/A — opinion-based | Saves a vendor + a bill. |
| `disposable-email-domains` (2022 stale) | `disposable-email-domains-js` (2026 weekly-updated) | Package ecosystem change | Use the new one. |
| Raw `tailwind.config.js` | `@theme` in `globals.css` (Tailwind v4) | Phase 1 adopted | Phase 2 extends the same `@theme inline` block for brand override. |

**Deprecated/outdated (do not use):**
- `@supabase/auth-helpers-nextjs` — replaced by `@supabase/ssr`
- `disposable-email-domains@1.0.62` (npm) — stale since 2022; use `disposable-email-domains-js@1.24.0`
- Next.js Pages Router auth patterns — we are App Router only
- `getSession()` on server paths — banned

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `signInWithOtp` accepts the same `captchaToken` option as `signUp` | Pattern 3 | [ASSUMED] Supabase docs show `captchaToken` on `signUp` but are less explicit on `signInWithOtp`. Risk: magic-link signup bypasses CAPTCHA on server. Mitigation: first Phase 2 task MUST validate this by doing a real signInWithOtp call with an intentionally bad captchaToken and confirming Supabase rejects it. |
| A2 | `email_verified` JWT claim is reliably populated when `email_confirmed_at` is non-null | Pattern 6 | [CITED: supabase.com/docs/guides/auth/jwt-fields] but Pitfall 4 notes edge cases with social identities. Fallback plan already documented: `getUser()` round-trip in missing-claim cases. |
| A3 | Postgres trigger on `auth.users` can be installed via `supabase/migrations/` (requires postgres role) | Pattern 5 | [CITED: supabase discussion #34518 — postgres role can install on auth.users]. Risk: migration fails in CI/prod due to permission. Mitigation: first migration run in local `supabase db reset`, then push; if the push fails, move the trigger install to a manual Studio SQL step documented in the phase runbook. |
| A4 | `disposable-email-domains-js` exports a `DisposableEmailChecker` class | Pattern 7 | [ASSUMED] based on npm readme scan; not confirmed API shape for v1.24.0. Risk: import path is wrong. Mitigation: first task in Phase 2 is `pnpm add` + probe the actual export shape (similar to Phase 1's `HAS_GETCLAIMS` probe). |
| A5 | Vercel's `x-forwarded-for` first entry is the client IP | Pitfall 5 | [CITED: Vercel docs pattern]. Standard pattern for Vercel; well-documented. |
| A6 | Turnstile token expires ~5 minutes after issue; widget auto-refreshes | Pattern 8 | [ASSUMED] based on Cloudflare Turnstile default. Safe assumption for a thin React wrapper. |
| A7 | Supabase free tier rate-limit config (signup per IP per hour) is NOT reliably enforced | Constraint choice | [CITED: github.com/supabase/auth/issues/2333 + github.com/supabase/supabase/issues/41947]. This is WHY we implement our own counter rather than trust Supabase's built-in. |
| A8 | No phone verification is in scope | Out of scope | [CITED: REQUIREMENTS.md TRUST-08 labeled v1.1]. Verified. |
| A9 | No passkey/WebAuthn is in scope | Out of scope | [CITED: STACK.md Confidence Summary — passkeys LOW confidence, deferred]. Verified. |

**If this table has entries tagged [ASSUMED]:** User (or planner) should confirm A1 and A4 before or during Wave 0 of Phase 2 — these are the two assumptions that could require re-scoping. A1 (CAPTCHA on signInWithOtp) has a test case that validates it. A4 (package export shape) is a 30-second probe at install time.

---

## Open Questions

1. **Does `signInWithOtp` enforce Supabase's server-side CAPTCHA verification when a `captchaToken` is passed?**
   - What we know: `signUp` explicitly accepts and verifies `captchaToken`. `signInWithOtp` API reference lists `captchaToken` in the options type [CITED: supabase.com/docs/reference/javascript/auth-signinwithotp], but the public docs example for CAPTCHA integration uses `signUp`.
   - What's unclear: Whether Supabase Auth server rejects a bad `captchaToken` when sent with `signInWithOtp` (we want this — it's the gate).
   - Recommendation: First planning task adds a Vitest/Playwright integration probe — call `signInWithOtp` with an invalid `captchaToken` and assert the response is a rejection. If it isn't (edge case), fall back to a server-side `/siteverify` call before the Supabase call.

2. **How does the per-IP rate limit apply to OAuth signups?**
   - What we know: OAuth flows don't run through our server action; the first server-side code that executes is `/auth/callback/route.ts`, which fires AFTER Supabase has already created the `auth.users` row.
   - What's unclear: Should we count Google signups against the per-IP limit? If yes, where do we check?
   - Recommendation: Implement a second counter inside the `/auth/callback` route handler that increments `signup_attempts` and deletes the newly-created user if the limit is exceeded. This is racy but acceptable for bot mitigation. Alternative: move the IP check into a Postgres trigger on `auth.users` that reads `auth.jwt() ->> 'request.headers.x-forwarded-for'` — NOT sure this claim is populated; needs probe.

3. **Where does the disposable-email seed data come from at migration time?**
   - What we know: `disposable-email-domains-js@1.24.0` ships a JSON list inside `node_modules`.
   - What's unclear: Should the Postgres seed pull from `node_modules` at migration time (coupling migration to a dev dep), or export a flat file into `supabase/seed.sql` that's regenerated quarterly?
   - Recommendation: Build a `scripts/sync-disposable-domains.mjs` that reads from `disposable-email-domains-js` and writes to `supabase/migrations/{timestamp}_disposable_seed.sql` as a one-time migration; refresh quarterly via a separate migration. This keeps the migration deterministic and does NOT couple migrations to npm dev deps at deploy time.

4. **Should logout be a server action or a POST route handler?**
   - What we know: UI-SPEC locks the button UI. `supabase.auth.signOut()` can be called from either.
   - What's unclear: Minor pattern choice with identical outcome.
   - Recommendation: POST route handler (`app/auth/signout/route.ts`). Reason: cleaner to add to the footer layout component without pulling a server action through a client boundary, and avoids prefetch-triggered logout (Pitfall 8).

5. **Is there a risk that the `@theme inline` brand override (`--color-primary: var(--color-clay)`) breaks shadcn components installed in Phase 1 (Button, Card)?**
   - What we know: UI-SPEC specifies the override is safe.
   - What's unclear: Whether any Phase 1 surfaces currently rely on the default stone primary color (probably not — Phase 1 is mostly infrastructure).
   - Recommendation: Run `pnpm build` + Playwright smoke after adding the override; visually inspect the fire-test-event button which currently uses `Button` default.

---

## Environment Availability

This phase has minimal new external dependencies. Mostly configuration changes.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project `hfdcsickergdcdvejbcw` | All auth flows | ✓ (Phase 1) | Postgres 17, us-east-1 | — |
| Supabase Studio access | Google OAuth config, Turnstile secret config, URL allowlist | ✓ (assumed — user has Studio access) | — | — |
| Google Cloud Console project | OAuth client ID + secret for Google sign-in | ✗ (must be created) | — | Block AUTH-01; can't ship without it |
| Cloudflare Turnstile site + secret | AUTH-08 | ✗ (must be created; Cloudflare account needed) | — | Block AUTH-08; can't ship without it |
| Resend SMTP (for magic-link emails) | AUTH-02 email delivery | ✓ (Phase 1 wired) | `hello@barterkin.com` verified | — |
| Node 20 LTS | Dev + CI | ✓ | 20.x | — |
| pnpm ≥ 10 | Install | ✓ | Phase 1 CI fix applied | — |
| Supabase CLI | Migrations | ✓ | `supabase@2.92.1` in devDeps | — |
| Vercel project | Preview URLs in OAuth allowlist | ✓ (Phase 1) | — | — |

**Missing dependencies with no fallback:**
- Google Cloud Console OAuth client (must be procured before AUTH-01 can execute — add to phase Wave 0 as an explicit human task)
- Cloudflare Turnstile site + secret (must be procured before AUTH-08 can execute — add to phase Wave 0 as an explicit human task)

**Missing dependencies with fallback:**
- None (all external services either exist or are blocking)

**Procurement runbook (Wave 0 task):**
1. Create Google Cloud Console project "barterkin-auth", enable OAuth consent screen, create OAuth Client ID (type: Web application).
   - Authorized JavaScript origins: `http://localhost:3000`, `https://barterkin.com`, `https://*-{vercel-team}.vercel.app`.
   - Authorized redirect URIs: `https://hfdcsickergdcdvejbcw.supabase.co/auth/v1/callback`.
   - Paste Client ID + Secret into Supabase Studio → Auth → Providers → Google.
2. Create Cloudflare Turnstile site in Cloudflare dashboard → Turnstile → Add site.
   - Domain: `barterkin.com` (works for subdomains too; configure with the production domain).
   - Widget mode: Managed (default; shows challenge only when needed).
   - Paste Site Key into `.env.local` as `NEXT_PUBLIC_TURNSTILE_SITEKEY`.
   - Paste Secret Key into Supabase Studio → Auth → Bot and Abuse Protection → CAPTCHA provider: Cloudflare Turnstile.
3. In Supabase Studio → Auth → URL Configuration, add to the allowlist:
   - `http://localhost:3000/**`
   - `https://*-{vercel-team}.vercel.app/**`
   - `https://barterkin.com/**`
4. In Supabase Studio → Auth → Settings → Email → Confirm email: ON (already default).

---

## Validation Architecture

(Included per `.planning/config.json` workflow.nyquist_validation = true.)

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 (unit) + Playwright 1.59.1 (E2E) |
| Config file | `vitest.config.ts` + `playwright.config.ts` (both exist Phase 1) |
| Quick run command | `pnpm test` (Vitest, unit only, ~2s) |
| Full suite command | `pnpm test && pnpm e2e` (unit + E2E, ~30-60s) |
| Type check | `pnpm typecheck` (< 5s) |
| Lint | `pnpm lint` (< 5s) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Google OAuth round-trip lands authenticated | E2E (mocked OAuth provider) | `pnpm e2e tests/e2e/login-google-oauth.spec.ts` | ❌ Wave 0 |
| AUTH-02 | Magic link → /auth/confirm → session set | E2E (mock Resend + supabase inbucket or intercept) | `pnpm e2e tests/e2e/login-magic-link.spec.ts` | ❌ Wave 0 |
| AUTH-03 | Session persists across refresh | E2E | `pnpm e2e tests/e2e/session-persistence.spec.ts` | ❌ Wave 0 |
| AUTH-04 | Unverified user redirected to /verify-pending | E2E | `pnpm e2e tests/e2e/verify-pending-gate.spec.ts` | ❌ Wave 0 |
| AUTH-04 | RLS blocks unverified profile from directory | Unit (SQL via `pgtap` or integration test against local supabase) | `pnpm test tests/unit/rls-email-verify.test.ts` | ❌ Wave 0 |
| AUTH-05 | Logout clears session | E2E | `pnpm e2e tests/e2e/logout.spec.ts` | ❌ Wave 0 |
| AUTH-06 | 6th signup from same IP in 24h rejected | Unit (function-level) + E2E | `pnpm test tests/unit/rate-limit.test.ts` | ❌ Wave 0 |
| AUTH-07 | @mailinator.com rejected with friendly error | Unit + E2E | `pnpm test tests/unit/disposable-email.test.ts` | ❌ Wave 0 |
| AUTH-08 | Signup without Turnstile token rejected | E2E | `pnpm e2e tests/e2e/captcha-required.spec.ts` | ❌ Wave 0 |
| AUTH-09 | Authed user on /login redirected to /directory | E2E | `pnpm e2e tests/e2e/auth-group-redirect.spec.ts` | ❌ Wave 0 |
| AUTH-10 | All three legal pages render + have required headings | E2E | `pnpm e2e tests/e2e/legal-pages.spec.ts` | ❌ Wave 0 |
| GEO-04 | ToS contains the locked non-residency clause | E2E (text assertion) | `pnpm e2e tests/e2e/legal-pages.spec.ts::tos-has-geo04` | ❌ Wave 0 |

### Happy Paths to Test

1. **Magic-link signup + verify:** User enters email → sees "Check your email" → clicks link (simulated) → lands on `/directory` (or `/verify-pending` if profile not complete — but Phase 2 only has auth, so redirect target is `/`).
2. **Google OAuth signup:** User clicks "Continue with Google" → consent screen (mocked) → lands back authenticated.
3. **Session persistence:** User signs in → refreshes page → still signed in. Simulates 29-day cookie age via Playwright cookie manipulation.
4. **Logout:** Authed user clicks "Log out" in footer → redirected to `/`, session cookies cleared.
5. **Legal pages:** All three `/legal/*` pages render with correct H1, locked GEO-04 clause, and "Last updated" line.

### Failure Paths to Test

1. **Rate limit:** 6th signup attempt from same `x-forwarded-for` in 24h → friendly "Too many signups" error.
2. **Disposable email:** Signup with `foo@mailinator.com` → disposable-email error, no `auth.users` row created.
3. **Turnstile bypass:** Submit signup form with no captchaToken → server action rejects without calling Supabase.
4. **Missing email_confirmed_at:** User with `email_confirmed_at IS NULL` hits `/directory` → redirected to `/verify-pending`.
5. **RLS enforcement (defense-in-depth):** Directly query `profiles` as an unverified user via authed client → returns zero rows even if middleware were bypassed.
6. **OAuth redirect mismatch:** Attempt sign-in with misconfigured `redirectTo` → `/auth/error` page.
7. **Magic-link expired:** Click a synthetic expired token → error page (future-proof: Phase 2 covers the copy, not the server-side expire handling — Supabase does that).

### What Can Be Automated vs Manual

**Automated:**
- All server-action + route-handler logic (Vitest unit tests on pure functions; E2E with mocked Supabase for integration behavior).
- RLS enforcement (can be validated via local `supabase start` + SQL query as authenticated vs unverified).
- Middleware route-gating (Playwright with cookie fixtures).
- Legal-page text assertions (Playwright `expect(page.locator('...')).toContainText(...)`).
- Rate-limit counter behavior (Vitest against in-memory `signup_attempts` mock).
- Disposable-email list (Vitest — check 5 known disposable, 5 known legitimate).

**Manual (one-time):**
- Real Google OAuth consent screen (QA: do it once in production to confirm the Google branding, app name, and permission list).
- Real Resend email deliverability (verify magic-link lands in inbox, not spam — mail-tester has already passed 10/10 in Phase 1, so this is a spot-check).
- Supabase Studio configuration (Google client ID, Turnstile secret, URL allowlist) — cannot be tested with the app's own test suite; document in a Wave 0 runbook.

### Sampling Rate

- **Per task commit:** `pnpm lint && pnpm typecheck && pnpm test` (unit only, <10s)
- **Per wave merge:** `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` (full, ~60s)
- **Phase gate:** Full suite green + Playwright smoke on Vercel preview URL before `/gsd-verify-work`.

### Wave 0 Gaps

Phase 1 already installed Vitest + Playwright; no new framework install needed. All gaps are test files:

- [ ] `tests/unit/disposable-email.test.ts` — covers AUTH-07
- [ ] `tests/unit/rate-limit.test.ts` — covers AUTH-06 (function-level)
- [ ] `tests/unit/magic-link-schema.test.ts` — Zod schema happy/unhappy paths
- [ ] `tests/unit/rls-email-verify.test.ts` — SQL integration test (requires local `supabase start`; may be deferred to Phase 3 if Phase 2 RLS is just "function installed, no table using it yet")
- [ ] `tests/e2e/login-magic-link.spec.ts` — covers AUTH-02
- [ ] `tests/e2e/login-google-oauth.spec.ts` — covers AUTH-01 (with OAuth mock)
- [ ] `tests/e2e/verify-pending-gate.spec.ts` — covers AUTH-04
- [ ] `tests/e2e/auth-group-redirect.spec.ts` — covers AUTH-09
- [ ] `tests/e2e/session-persistence.spec.ts` — covers AUTH-03
- [ ] `tests/e2e/logout.spec.ts` — covers AUTH-05
- [ ] `tests/e2e/captcha-required.spec.ts` — covers AUTH-08
- [ ] `tests/e2e/legal-pages.spec.ts` (incl. GEO-04 clause assertion) — covers AUTH-10 + GEO-04
- [ ] `tests/e2e/footer-links.spec.ts` — covers UI-SPEC footer contract
- [ ] Playwright fixture: `tests/e2e/helpers/mock-supabase.ts` for mocking auth responses

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (managed); no custom password handling; Google OAuth + magic-link OTP. Session JWT, 30-day refresh. |
| V3 Session Management | yes | @supabase/ssr cookie pattern; JWT claims verified via `getClaims()`; session refresh on every request via middleware. |
| V4 Access Control | yes | Postgres RLS as trust boundary; middleware as UX layer. Email-verify gate enforced in RLS (AUTH-04). `SECURITY DEFINER` helper `current_user_is_verified()`. |
| V5 Input Validation | yes | Zod schemas on all server actions. Email format validated client + server. Email domain normalized to lowercase. |
| V6 Cryptography | yes (indirectly) | Supabase handles JWT signing (HS256 via project secret); JWKS verified by `getClaims()`. Turnstile token is opaque — treat as random string. **Do NOT hand-roll JWT verify.** |
| V9 Communications | yes | HTTPS-only (Vercel enforces); Supabase enforces HTTPS on auth endpoints; HSTS inherited from Vercel. |
| V11 Business Logic | yes | Rate limit on signups (AUTH-06); disposable-email block (AUTH-07); CAPTCHA (AUTH-08). All three compose the "don't get spammed" floor. |
| V13 Files | no | No file upload in Phase 2. |
| V14 Configuration | yes | Secrets: Turnstile SECRET in Supabase Studio, Supabase service-role in server-only env, Google OAuth secret in Supabase Studio. No NEXT_PUBLIC_ prefix on any of them. Studio config + Vercel env vars diverge for preview/prod. |

### Known Threat Patterns for Next.js App Router + Supabase Auth

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cookie spoofing (forged JWT) | Spoofing | `getClaims()` verifies against JWKS; `getUser()` verifies against Auth server. `getSession()` BANNED. |
| OAuth redirect-URI injection | Tampering | Supabase Studio URL allowlist enforces; wildcards only for `*-{team}.vercel.app` and specific paths. |
| CAPTCHA replay / single-use token race | Tampering | Pass `captchaToken` once (to Supabase); never verify twice. |
| Bot-mass signup (IP rotation) | DoS | Turnstile (primary) + per-IP counter (secondary). Known limit: residential proxy networks defeat per-IP. |
| Disposable-email throwaway accounts | Repudiation | `disposable-email-domains-js` list at submit + Postgres trigger for OAuth. |
| Session fixation | Spoofing | @supabase/ssr rotates session on every sign-in; PKCE prevents code-injection attacks. |
| CSRF on logout (GET prefetch) | Tampering | POST-only `/auth/signout` handler. |
| RLS bypass via view or RPC | Information Disclosure | NO `SECURITY DEFINER` views in Phase 2 (Phase 3+ profile views must be `SECURITY INVOKER` or carefully gated). |
| Email enumeration via signup error messages | Information Disclosure | Magic-link "email sent" response is identical for existing vs new users (Supabase default). Don't differentiate. |
| Privilege escalation via `user_metadata` write | Tampering | Never trust `user_metadata` in RLS; user-writable. Trust only top-level JWT claims. |
| Admin role leak | Information Disclosure | No admin role in Phase 2 (admin ops are SQL only per CLAUDE.md). |

### CLAUDE.md Required Security Controls (verbatim extractions)

- **Service-role key stays server-only** — no `NEXT_PUBLIC_` prefix. (Already enforced in `lib/supabase/admin.ts` Phase 1 with `import 'server-only'`.)
- **No `getSession()` on server paths** — always `getClaims()` or `getUser()`. (Enforced in Phase 1.)
- **No `@supabase/auth-helpers-nextjs`** — deprecated, must stay uninstalled.
- **RLS enabled on all public tables by default.** (Phase 2 `signup_attempts` table explicitly enables RLS with zero policies — service-role only.)
- **SPF + DKIM + DMARC on SMTP.** (Phase 1 already completed; Resend verified for `hello@barterkin.com`.)
- **Member email/phone never exposed in directory UI.** (Phase 2 does not build directory UI; Phase 3/4 responsibility — research flag only.)
- **Fresh Supabase + Vercel accounts** (already provisioned Phase 1).

---

## Sources

### Primary (HIGH confidence)

- [Supabase SSR docs — Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/nextjs) — `@supabase/ssr` setup
- [Supabase PKCE flow docs](https://supabase.com/docs/guides/auth/sessions/pkce-flow) — exchangeCodeForSession
- [Supabase CAPTCHA docs](https://supabase.com/docs/guides/auth/auth-captcha) — confirms `captchaToken` option + Studio-side secret config
- [Supabase Cloudflare Turnstile example](https://supabase.com/docs/guides/functions/examples/cloudflare-turnstile) — `/siteverify` pattern
- [Supabase Auth Google provider](https://supabase.com/docs/guides/auth/social-login/auth-google) — Studio config + Client ID source
- [Supabase JWT claims reference](https://supabase.com/docs/guides/auth/jwt-fields) — confirms `email_verified` claim
- [Supabase Rate Limits](https://supabase.com/docs/guides/auth/rate-limits) — confirms built-in limits are NOT per-IP per-day (motivates custom counter)
- [Supabase magic-link (signInWithOtp) docs](https://supabase.com/docs/guides/auth/passwordless-login/auth-magic-link) — confirms `emailRedirectTo` + PKCE flow
- [Supabase verifyOtp JavaScript reference](https://supabase.com/docs/reference/javascript/auth-verifyotp) — confirms `type` + `token_hash` shape
- [Supabase exchangeCodeForSession JS reference](https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession) — confirms code-exchange
- [Supabase UI docs — password-based-auth (with auth/confirm route)](https://supabase.com/ui/docs/nextjs/password-based-auth) — verbatim route handler source
- `npm view @supabase/ssr` @ 0.10.2 (verified 2026-04-19)
- `npm view @supabase/supabase-js` @ 2.103.3 (verified 2026-04-19)
- `npm view @marsidev/react-turnstile` @ 1.5.0 (verified 2026-04-19, published 2026-03-28)
- `npm view disposable-email-domains-js` @ 1.24.0 (verified 2026-04-19, published 2026-03-15)
- `.planning/research/STACK.md` (Phase 1 research, HIGH trust)
- `.planning/research/PITFALLS.md` (Phase 1 research, HIGH trust — Pitfalls 1-11)
- `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (approved Phase 2 UI contract)
- `.planning/REQUIREMENTS.md` (v1 requirements, authoritative)
- `lib/supabase/{client,server,middleware,admin}.ts` (Phase 1 wired code)
- `middleware.ts` (Phase 1 wired matcher)

### Secondary (MEDIUM confidence — verified against official sources)

- [GitHub issue #2037 — exchangeCodeForSession deferred SIGNED_IN regression](https://github.com/supabase/supabase-js/issues/2037) — confirms fix landed before v2.103.3
- [Supabase GitHub discussion #34518 — `auth.users` triggers work via postgres role](https://github.com/orgs/supabase/discussions/34518)
- [Supabase auth #2333 — auth rate limit not reliably enforced](https://github.com/supabase/auth/issues/2333)
- [Supabase supabase #41947 — same](https://github.com/supabase/supabase/issues/41947)
- [Supabase auth #1620 — email_verified not updated in identities table for social logins](https://github.com/supabase/auth/issues/1620)
- [Upstash pricing (free tier data)](https://upstash.com/pricing)
- [ryankatayi.com — Server-Side Auth in Next.js with Supabase setup guide](https://www.ryankatayi.com/blog/server-side-auth-in-next-js-with-supabase-my-setup) — corroborates `/auth/confirm` pattern
- [@marsidev/react-turnstile docs — server validation](https://docs.page/marsidev/react-turnstile/validating-a-token)
- [disposable-email-domains/disposable-email-domains repo](https://github.com/disposable-email-domains/disposable-email-domains) — canonical source
- [disposable-email-domains-js repo](https://github.com/mziyut/disposable-email-domains-js) — npm package

### Tertiary (LOW confidence — flag for validation)

- [freecodecamp — Build Secure SSR Authentication with Supabase, Astro, and Cloudflare Turnstile](https://www.freecodecamp.org/news/build-secure-ssr-authentication-with-supabase-astro-and-cloudflare-turnstile/) — Astro example; pattern is transferable but not Next.js-specific. Used only to corroborate `captchaToken` flow.
- [Mo's tech takes — how to add Google OAuth to Next.js with Supabase](https://www.mohamed3on.com/how-to-add-google-o-auth-to-next-js-with-supabase-auth/) — community pattern
- SamuelSackey/nextjs-supabase-example — community example, corroborates callback code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version verified against npm registry on research date
- Architecture (route handlers, middleware, RLS): HIGH — canonical patterns from Supabase docs + verified community examples
- CAPTCHA integration with `signInWithOtp`: MEDIUM — `signInWithOAuth` and `signUp` are docs-confirmed; `signInWithOtp` requires a Wave 0 probe (flagged in Open Question #1)
- Per-IP rate limit table design: HIGH for the Postgres shape; MEDIUM for the OAuth path (Open Question #2)
- Pitfalls: HIGH — cross-verified across PITFALLS.md Phase 1 research + current docs
- State-of-the-art migrations: HIGH — versions verified, issue #2037 closure verified
- Disposable-email package export shape: MEDIUM — Wave 0 probe will confirm (Assumption A4)

**Research date:** 2026-04-19
**Valid until:** 2026-05-19 (30 days — stable ecosystem; re-verify Supabase auth changelog if phase work extends beyond)

**Next step:** Planner consumes this RESEARCH.md + 02-UI-SPEC.md to produce `02-{N}-PLAN.md` files covering (tentatively): Wave 0 (procurement + probes + migrations), Wave 1 (server actions + route handlers + middleware extension), Wave 2 (UI components + legal pages + footer), Wave 3 (E2E tests + phase-gate verification).
