# Pitfalls Research

**Domain:** Solo-builder community skill-barter directory (Next.js 15 App Router + Supabase Auth/RLS/Storage + Resend email relay + Georgia-only soft gate)
**Researched:** 2026-04-17
**Confidence:** HIGH for technical pitfalls (verified against Supabase + Vercel 2025 docs and active GitHub discussions); MEDIUM for product/trust pitfalls (composite of directory and marketplace literature applied to this specific shape).

Phase labels used below:

- **P1 — Foundation & Landing** (Next.js project, palette, domain, analytics, legal shell)
- **P2 — Auth & Profile** (Supabase Auth, RLS baseline, profile CRUD, email verify)
- **P3 — Directory** (browse/search, filters, profile pages)
- **P4 — Contact Relay** (Resend integration, form + relay edge function, rate limits)
- **P5 — Trust, Abuse, Moderation** (report flow, privacy defaults, Georgia-gate response)
- **P6 — Launch & Seeding** (founder profiles, invite pipeline, metric instrumentation)

---

## Critical Pitfalls

### Pitfall 1: Using `supabase.auth.getSession()` on the server to gate access

**What goes wrong:**
Server Components (layout, page, route handlers) use `getSession()` to check auth. The session is read from the cookie and returned without hitting Supabase Auth. A forged or stale cookie can pass the check, and your "logged-in only" or "profile owner only" server rendering leaks data to unauthenticated or impersonating requests.

**Why it happens:**
`getSession()` is faster and the Supabase JS client logs a warning but still returns data. Developers copy `if (session)` guards from old tutorials or from client-side code and never hear the warning in production.

**How to avoid:**
- Every server-side auth check uses `supabase.auth.getUser()`, which revalidates the JWT against the Auth server. Treat `getSession()` as client-only.
- Add an ESLint rule or simple Grep pre-commit check that flags `getSession(` in any `app/**` server file.
- Wrap it once in a `getAuthedUser()` helper and use that everywhere; no direct calls in pages.

**Warning signs:**
- Code review turns up `const { data: { session } } = await supabase.auth.getSession()` inside a page, layout, or route handler.
- Supabase client warning "Using the user object as returned from supabase.auth.getSession() could be insecure" in server logs.
- `cookie` is read but never round-tripped to `/auth/v1/user`.

**Phase to address:** P2 (Auth & Profile) — bake `getAuthedUser()` into the first auth commit before any protected route is written.

---

### Pitfall 2: Service-role key reaching the client bundle

**What goes wrong:**
`SUPABASE_SERVICE_ROLE_KEY` (or any secret) is imported in a module that ends up in a Client Component, or read via `process.env.SUPABASE_SERVICE_ROLE_KEY` inside a file with `"use client"`. Next.js silently inlines it into the client chunk if it's prefixed `NEXT_PUBLIC_`, or worse, the code runs fine in dev because env vars are readable server-side and the leak only shows up after a production build is inspected. Full DB access is now public.

**Why it happens:**
- Developer adds `NEXT_PUBLIC_` to a secret to "fix" an undefined error.
- A shared helper like `db.ts` imports the service client and is reused in both server and client code; Next bundles it for the client too.
- Route handlers and server actions look syntactically identical to client utilities.

**How to avoid:**
- Put the service-role client in `lib/supabase/admin.ts` and start the file with `import "server-only"`. Any accidental client import becomes a build-time error.
- Two named clients only: `createBrowserSupabase()` (anon key) and `createAdminSupabase()` (service role, server-only). No "one client to rule them all."
- CI step: after `next build`, `grep -r "service_role"` over the `.next/static` output. Should return nothing.
- Never prefix a service key with `NEXT_PUBLIC_`. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are allowed in the public bundle.

**Warning signs:**
- Any file imports `createClient(...supabaseUrl, serviceRoleKey...)` without `"server-only"` at the top.
- Service-role client is imported into a component file (anything in `app/**` that doesn't end with `route.ts` or is not a Server Component).
- `process.env.NEXT_PUBLIC_*` appears next to the word `role`, `secret`, `admin`, or `key`.

**Phase to address:** P2 (Auth & Profile) — set the `server-only` convention on day one; add the CI grep before P4 ships contact relay.

---

### Pitfall 3: Using `@supabase/auth-helpers-nextjs` instead of `@supabase/ssr`

**What goes wrong:**
Pick `auth-helpers-nextjs` by copying an older tutorial. It's frozen at 0.15.0, receives no fixes, and its cookie model predates Next.js 15's async `cookies()` API. Session refresh breaks intermittently, middleware logs Turbopack "cookies() should be awaited" errors, and migrating later costs a day of tangled diffs.

**Why it happens:**
Search results from 2023-2024 still dominate LLM and blog results. Stack Overflow copy-paste is pre-deprecation.

**How to avoid:**
- Install `@supabase/ssr` from day one. Do not install `@supabase/auth-helpers-nextjs` at all. If you see it in `package.json`, remove before the first commit.
- Reference the current official setup: [Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs).
- Pin `@supabase/ssr >= 0.10.0` — it handles CDN cache headers automatically.

**Warning signs:**
- `package.json` contains `@supabase/auth-helpers-nextjs`.
- Imports like `createMiddlewareClient`, `createServerComponentClient`, `createClientComponentClient` appear anywhere. These are auth-helpers. The `@supabase/ssr` equivalents are `createServerClient` and `createBrowserClient`.

**Phase to address:** P1/P2 — enforce at project scaffold; never shipped with the wrong package.

---

### Pitfall 4: Middleware cookie round-trip broken — session refresh fails silently

**What goes wrong:**
Middleware refreshes the Supabase auth token but writes cookies onto a `NextResponse` that is not returned, or creates a fresh `NextResponse.next()` after reading cookies and loses the `Set-Cookie` header. Users appear logged in briefly, then "log out" on refresh. Sometimes session survives for 1 hour then breaks when the JWT refreshes.

**Why it happens:**
The required pattern — pass the same request/response through `createServerClient`'s `cookies.getAll` and `cookies.setAll`, then return that exact response — is fragile. Copy-pasted middleware often constructs a new `NextResponse` at the end, discarding refreshed cookies. Older examples use `response.cookies.set` in ways that don't match `@supabase/ssr ≥ 0.4`'s `setAll` contract.

**How to avoid:**
- Use the canonical middleware template from [Supabase's SSR docs](https://supabase.com/docs/guides/auth/server-side/nextjs) verbatim. Do not hand-roll.
- Keep middleware trivial: refresh session, optionally redirect unauthenticated users. Do not fetch data, do not branch on roles.
- Write one Playwright test that logs in, waits 1 minute past a token refresh (or mocks expiry), navigates, and verifies the session is still live.
- Never swallow errors in the middleware `try/catch`. Log them — a silent cookie-set failure is the root of most "works in dev, breaks in prod" auth bugs.

**Warning signs:**
- Intermittent logouts after idle time or tab switches.
- "User null" in Server Components despite cookies present in DevTools.
- A `NextResponse.next()` or `new NextResponse(...)` appears in middleware *after* the Supabase client is constructed.
- Turbopack warning: "cookies() should be awaited."

**Phase to address:** P2 — write middleware once, test it once, don't touch it again unless Supabase docs change.

---

### Pitfall 5: RLS on directory read bypassed via joins, views, or RPC

**What goes wrong:**
`profiles` has RLS "only visible if email_verified AND is_active AND county_confirmed." A view `public_directory` is created to denormalize the data, or an RPC `search_profiles(...)` is defined. Postgres views default to `SECURITY DEFINER` behavior (they run with the creator's privileges), so the view returns every profile regardless of the underlying RLS. RPCs return a table that quietly includes hidden rows, or join to `auth.users` and leak emails.

**Why it happens:**
- Views and RPCs are the natural answer to N+1 problems on the directory page. Developers write them mid-feature under deadline pressure.
- Postgres < 15 defaults to `security_invoker = false` on views. Supabase is on Postgres 15+ now, but the lint will catch issues only if you run it.
- RPCs exposed in `public` schema are automatically callable via PostgREST, so a "private helper" function becomes public API.

**How to avoid:**
- Every view is created with `WITH (security_invoker = true)`. Make this a project convention; add a linter/review checklist.
- Private helper functions live in a non-`public` schema (e.g., `private.`). PostgREST does not expose non-`public` schemas via RPC.
- Functions that must be `SECURITY DEFINER` (rare) get a comment `-- SECURITY DEFINER: justified because <reason>` and their own PR review.
- Enable and read the Supabase Database Advisor lints: `0010_security_definer_view`, `0011_policy_exists_rls_disabled`, etc. Run before every deploy.
- Write a `pg_prove` or SQL test that selects from every public view/RPC as an anon user and as an unverified user; assert row counts match RLS expectations.

**Warning signs:**
- `CREATE VIEW` without `security_invoker`.
- Function in `public` schema with `SECURITY DEFINER` and no `SET search_path = ''`.
- Directory page seems to load unlisted profiles when you're logged in as admin, but "it works for my test user."
- Database Advisor panel in Supabase Studio shows any red lints.

**Phase to address:** P3 (Directory) — before any list/search page is built. Do not optimize with views/RPCs until RLS on base tables is proven.

---

### Pitfall 6: Default-allow policies on insert / update

**What goes wrong:**
RLS is enabled on `profiles` but only `SELECT` has a policy. Or: policies cover `SELECT` and `UPDATE` with `auth.uid() = id`, but `INSERT` is open to "anyone authenticated." An attacker inserts a row with `id = <some other user's auth.uid()>`, fully impersonating them. Or more mundanely, spam signups insert 1,000 fake profiles because no WITH CHECK constrains the row shape.

**Why it happens:**
- RLS is opt-in by command. Enabling RLS without every `FOR INSERT|UPDATE|DELETE` policy silently denies those operations — so developers add a permissive insert policy "to unblock signup" and move on.
- `USING` vs `WITH CHECK` are confusable. `USING` applies to read/update target row; `WITH CHECK` applies to the new row being written.

**How to avoid:**
- Every RLS-enabled table has explicit policies for `SELECT`, `INSERT`, `UPDATE`, `DELETE`. Missing command = fully locked.
- Every `INSERT` policy has `WITH CHECK (auth.uid() = user_id)` — and `user_id` columns have a default of `auth.uid()` so clients don't set it.
- Every `UPDATE` policy has BOTH `USING (auth.uid() = user_id)` AND `WITH CHECK (auth.uid() = user_id)` — otherwise users can update their row to someone else's `user_id`.
- Profile creation happens via an `AFTER INSERT ON auth.users` trigger (server-side, service-role), not a client-side insert. Clients only update their own row.

**Warning signs:**
- A policy has `USING (true)` or `WITH CHECK (true)` in any command.
- `INSERT` policies without `WITH CHECK`.
- Profile row is created from the client right after sign-up.

**Phase to address:** P2 — Auth & Profile is the first moment RLS gets real. Get this right once; every later table inherits the pattern.

---

### Pitfall 7: Confusing `auth.uid()` with `profiles.id`

**What goes wrong:**
Profile table has its own `id uuid primary key default uuid_generate_v4()` and a separate `user_id uuid references auth.users`. RLS uses `auth.uid() = id` instead of `auth.uid() = user_id`. Every query returns zero rows, so a developer "fixes" it by weakening the policy to `USING (true)` or disabling RLS to debug — and never re-enables it.

**Why it happens:**
Tutorials disagree. Some use `id uuid primary key references auth.users(id)` (profile PK *is* the auth user ID). Others use a separate surrogate `id` + `user_id` FK. Mixing conventions across tables causes the brain-bug.

**How to avoid:**
- Pick one convention and apply to every owned table. Recommendation: **`id uuid primary key references auth.users(id) on delete cascade`**. Simpler RLS (`auth.uid() = id`), simpler joins, no surrogate ID confusion.
- Skills-offered, skills-wanted, photos, etc. use `profile_id uuid references profiles(id) on delete cascade` and RLS `auth.uid() = profile_id`.
- Never "disable RLS to debug." Use `set local role authenticated` + `set local request.jwt.claims` in `psql` instead.

**Warning signs:**
- Any table has `user_id` and `id` as separate columns where `id` isn't strictly needed.
- RLS policies work on one table but return zero rows on another.
- Git history shows `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` and no corresponding `ENABLE`.

**Phase to address:** P2 — set table convention in the first migration.

---

### Pitfall 8: Avatar storage bucket public-vs-private misconfigured

**What goes wrong:**
Two symmetric failure modes:
1. **Bucket is public (by mistake):** anyone with a URL pattern guess can enumerate and scrape every member's avatar. Honest configuration, but members didn't consent to public hosting.
2. **Bucket is private (correctly), but you rely on public URLs:** `getPublicUrl()` returns a URL that returns 400 because the bucket is private. Avatars don't load. Panicked fix: flip the bucket to public. You have leak #1.

Third variant: public bucket + RLS policies on `storage.objects`. RLS policies do nothing when the bucket is public; read is wide open.

**Why it happens:**
Supabase's quickstart examples use public buckets for avatars because it's simpler. The `public` flag on a bucket overrides RLS for reads.

**How to avoid:**
- Avatars are OK as public for MVP (members already consent to their photo being on the directory page). Document this explicitly: "avatar URLs are publicly addressable; do not upload private photos."
- Use the `avatars` public bucket with RLS policies on `storage.objects` for `INSERT`/`UPDATE`/`DELETE` — these *do* apply even on public buckets (only SELECT is bypassed).
- Enforce filename = `{profile_id}/{uuid}.jpg` via `WITH CHECK ((storage.foldername(name))[1] = auth.uid()::text)` so a user can't overwrite someone else's avatar.
- Any future private-content bucket (ID docs, private messages) uses a **private** bucket + signed URLs.
- Set bucket `file_size_limit` and `allowed_mime_types` in the bucket config — not later in code.

**Warning signs:**
- `storage.objects` INSERT/UPDATE policies missing or overly permissive.
- Avatar URLs contain the raw filename the user uploaded (upload sanitization missing).
- Unlimited file size on the bucket config.

**Phase to address:** P2 (profile photo upload) — configure bucket once with size + MIME + RLS. P5 revisits for any future private content.

---

### Pitfall 9: Caching authenticated directory pages — cross-user data leak

**What goes wrong:**
Next.js 15's default is "no cache," which is safer — but the moment someone adds `export const revalidate = 60` to a profile page or wraps a fetch in `cache: 'force-cache'`, authenticated responses can get cached by Vercel's CDN and served to the *next* visitor, including `Set-Cookie` headers. User A sees User B's dashboard. Or the public directory looks stale for hours because the writer forgot to `revalidatePath` after signup.

**Why it happens:**
- Developer adds caching to fix a perf issue without auditing which routes are personalized.
- `export const dynamic = 'force-dynamic'` is remembered on one page and forgotten on another.
- Middleware-refreshed cookies hit the Set-Cookie header on a route whose response was cached.

**How to avoid:**
- Any route that reads `supabase.auth.getUser()` or personalized data: `export const dynamic = 'force-dynamic'` AND `export const revalidate = 0`. Make this a snippet in the IDE.
- `@supabase/ssr ≥ 0.10.0` sets the right `Cache-Control` headers automatically in its `setAll` callback — confirm you're not overriding them.
- Public directory list is safe to cache (it's public anyway) — use `revalidate = 60` there, and call `revalidatePath('/directory')` from the signup completion server action.
- Profile *detail* pages are public too, but if logged-in viewers see a personalized "Contact" button state, split the route: static shell + client island for the personalized bit.
- Test: two browsers, two users, verify neither sees the other's data after the first is in the cache.

**Warning signs:**
- `Cache-Control: s-maxage=...` on responses that also have `Set-Cookie`.
- Users report "I'm logged in as someone else."
- Directory shows old counts after signup.

**Phase to address:** P3 (Directory) and P4 (Contact) — each new route's dynamic/revalidate posture is explicit in the PR.

---

### Pitfall 10: N+1 queries on the directory list

**What goes wrong:**
Directory page renders 50 cards. Each card runs: `select profile`, then `select skills_offered where profile_id = ...`, then `select skills_wanted`, then `select avatar_url`. That's 200 queries per page view. At 5 users browsing, the free-tier Postgres pool saturates.

**Why it happens:**
Relational thinking + component-driven rendering. Each card component fetches "just what it needs."

**How to avoke:**

**How to avoid:**
- One query per page via PostgREST embedding: `.select('id, display_name, county, avatar_url, skills_offered(*), skills_wanted(*)')`.
- If filters get complex (multi-select skills, full-text on bio), write one RPC — e.g., `search_profiles(county, categories[], query_text, limit, offset)` — returning a composite type. Remember Pitfall 5: put it in `private.` schema if it's not meant to be public, or ensure its result set respects RLS.
- Add a `select_for_directory` shape that matches the UI, not the domain.
- Load testing: Playwright + k6 or just `curl` in a loop — 100 concurrent directory loads should complete in < 3s on free tier.

**Warning signs:**
- Supabase dashboard query count spikes with traffic.
- Profile card components do their own `useEffect + fetch`.
- Network tab shows > 5 Supabase requests per page.

**Phase to address:** P3 — bake embedding from the first directory query. Reach for RPC only when embedding isn't expressive enough.

---

### Pitfall 11: Email relay becomes a spam cannon

**What goes wrong:**
Contact form has no rate limit. A spammer writes a script: for each profile in the directory, POST `/api/contact` with a payload. Resend sends 100 emails before the daily free-tier quota trips. Meanwhile every recipient has received phishing from `noreply@georgiabarter.com` with a `Reply-To` attacker email. Your sending domain reputation tanks; future real emails go to spam; Resend may suspend the account.

**Why it happens:**
"Send email" is one API call. Nobody writes rate limits in MVP. The Reply-To pattern (`From: platform, Reply-To: sender`) means the platform is named as sender on every abusive email.

**How to avoid:**
- Per-sender rate limit: max 5 contact-form sends per user per 24h, max 1 per recipient per 24h. Stored as a `contact_sends(sender_id, recipient_id, sent_at)` table; checked in the edge function before calling Resend.
- Per-IP rate limit on the contact endpoint for unauthenticated attempts (just reject; contact requires auth anyway — but double-defend).
- Cloudflare Turnstile or hCaptcha on the contact form itself.
- `Reply-To` is validated against the *logged-in user's verified email* only. Never free-form input.
- Sender must have `email_verified = true` and `created_at > 24h ago` (cooling period for fresh accounts).
- Edge function checks the daily Resend quota (cache a counter in Supabase) and returns a graceful "try again tomorrow" when near cap.
- Include the sender's profile URL in the relay email body so recipients can verify; include a one-click "Report this contact" link.

**Warning signs:**
- Resend dashboard shows high bounce or spam rate (> 4% bounce, > 0.08% spam, per Resend's policy).
- Multiple recipients with the same sender within minutes.
- Contact-form endpoint traffic > 10x directory traffic.

**Phase to address:** P4 — rate limits ship in the same PR as the relay, never as a follow-up. "We'll add rate limits after launch" is how this goes wrong.

---

### Pitfall 12: SPF / DKIM / DMARC not configured; Apple Private Relay drops silently

**What goes wrong:**
Domain is live, Resend sends from `noreply@georgiabarter.com`, but:
- No SPF record → Gmail flags as spam; half of signup emails never arrive.
- No DKIM → Outlook bin.
- No DMARC → no feedback loop; you don't know delivery is broken.
- Apple Sign In users receive nothing — Apple's private relay drops email from unregistered domains silently (no bounce).

The symptom is low signup → you think demand is soft, when actually magic-link emails are in junk folders.

**Why it happens:**
DNS is "someone else's problem." Resend onboarding walks you through SPF/DKIM, but DMARC is optional and Apple's Communication Email setup (`developer.apple.com` → Certificates → Services → Configure) is a separate, easy-to-miss step.

**How to avoid:**
- Pre-launch checklist: SPF TXT record points at `resend.com` (or whichever provider). DKIM CNAMEs per Resend's dashboard. DMARC at `v=DMARC1; p=quarantine; rua=mailto:...`.
- Register the sending domain in Apple's Communication Email Service for Sign In with Apple. Without it, private-relay addresses (`@privaterelay.appleid.com`) silently drop.
- Test from a clean Gmail, Outlook, iCloud, and Apple Private Relay inbox pre-launch. Verify `dkim=pass spf=pass dmarc=pass` in raw headers.
- Use [mail-tester.com](https://www.mail-tester.com/) or similar — target score ≥ 9/10.
- For the relayed contact emails, ensure From = verified domain, Reply-To = sender email. Do not set From = sender email (spoofing; will be rejected by DMARC).

**Warning signs:**
- Magic-link signups silently fail for Apple users (Pitfall 8 of the Sign In with Apple 2025 May incident is a reminder this can break suddenly).
- Gmail "via resend.com" disclaimer in inbox (means From domain ≠ sender domain; a minor signal, sometimes unavoidable).
- Resend bounce rate > 4% → account auto-pause.

**Phase to address:** P1 (domain setup) for SPF/DKIM/DMARC; P2 (auth) for Apple Communication Email Service registration; P4 (relay) re-validates before first real send.

---

### Pitfall 13: Empty-directory cold start — launch day conversion dies

**What goes wrong:**
Launch day: you share the URL. 200 people visit. The directory has 3 profiles (you, your friend, your friend's roommate), none in the visitor's county. Bounce rate 95%. The narrative "Georgia Barter has no one" sets in instantly on social. You cannot re-launch to the same audience.

**Why it happens:**
Marketplace/directory value scales super-linearly with listings; below a critical mass there is no value at all. Solo builders ship the product and neglect seeding because "we'll grow once people use it" — but there's no seed without a loop.

**How to avoid:**
- **Seed the supply side before opening the demand side.** Target 30-50 real profiles before public launch. Personally onboard them (DM, Zoom, "can I write your profile for you?").
- Pick a beachhead: two counties + two categories. "Chatham County farm labor + handyman" beats "Georgia, all skills" at MVP.
- "Ghost listing" filter: directory default hides profiles older than 90 days with no contact sent and no profile update. Freshness is signal of aliveness.
- Display profile count only when it's > 20 (ideally > 50). Below that, show search-by-category or a map with counts-per-county — framing around *activity*, not scarcity.
- Founder profile is real: real photo, real skills, real availability. You will receive contacts. Respond to every one.
- Metric from day one: not signups, but contacts initiated. Target: 1 contact per 10 profiles per week.

**Warning signs:**
- Directory has > 40 profiles but < 5 contacts/week.
- No profile has been updated in the last 30 days.
- Signups climb while contacts are flat → classic vanity-metric drift.

**Phase to address:** P6 (Launch & Seeding) — an explicit pre-launch seeding phase is part of the roadmap, not an afterthought.

---

### Pitfall 14: Commercial / cash creep — the directory becomes a free Craigslist

**What goes wrong:**
Without enforcement, profiles drift to "Plumbing services — $75/hr" or "Will paint your house, cash only." Now Georgia Barter is a commercial marketplace with no payments, no tax infrastructure, no insurance — and regulators plus the IRS have opinions about facilitating services for cash.

**Why it happens:**
Barter is fuzzy. "Accept cash or trade" feels harmless. Users optimize for reach and will use any free channel. Craigslist's trajectory shows this is the natural drift for any open directory.

**How to avoid:**
- Landing page + signup copy: "Georgia Barter is for skill-for-skill trades. Listings advertising paid services or cash-only arrangements will be removed."
- Profile form has **no** "rate" / "price" field. Free text in bio is the escape hatch but is discouraged.
- Skills-wanted field exists and is *required* — forces the barter framing ("I'll trade X for Y"), not just "I offer X."
- Keyword moderation on bio/skills: flag terms like `$`, `hourly`, `rate`, `cash`, `venmo`, `zelle`, `paypal`, `free estimate`. Flag into admin queue, not auto-reject (too many false positives).
- Feature one real trade story on the landing page per month. Narratives beat rules.
- **Do not** accept any transaction fee or referral commission at MVP. The second money flows through the platform, legal scope explodes (state registration, 1099s, sales tax nexus, escrow).

**Warning signs:**
- > 10% of profiles have dollar amounts in the bio.
- User DM support channel getting "when can I list my prices?"
- Facebook/Reddit mentions framing the site as "free Craigslist."

**Phase to address:** P5 (Trust & Moderation) for keyword flagging and admin queue; P1 (Landing) for framing copy; P2 (Profile) for absent rate field.

---

### Pitfall 15: First-contact harassment vector

**What goes wrong:**
The contact relay works: anyone logged in can email anyone else. A user harasses another by sending contact-form messages repeatedly with different pretexts. Or stalks: "I see you're in DeKalb, I'm coming to meet you." Women, LGBTQ members, and visible minorities bear the brunt. Without a block/report mechanism, the abused user's only option is to delete their profile.

**Why it happens:**
Directory MVPs treat "message another user" as a feature, not an attack surface. No one considers who *should not* be able to contact whom.

**How to avoid:**
- Per-recipient rate limit (Pitfall 11) already prevents floods.
- **Block** is a table: `blocks(blocker_id, blocked_id)`. The contact endpoint checks `NOT EXISTS (SELECT 1 FROM blocks WHERE blocker_id = recipient AND blocked_id = sender)` before sending.
- **Report** is a table: `reports(reporter_id, target_id, reason, created_at, resolved_at)`. Every relay email contains "Reply to this person" AND "Report this contact."
- Profile default is listed, but show *county* only — never city, neighborhood, or address. The profile form actively refuses to accept street names in the free-text bio (regex flag).
- First-contact message is limited to 500 chars, plaintext only — no links, no images. Reduces phishing/stalking vector.
- Admin dashboard (simple Supabase Studio query is fine for MVP) surfaces reports weekly.
- In Terms: "Georgia Barter does not verify members. Use caution when meeting anyone in person."

**Warning signs:**
- Any user has received > 3 contacts from the same sender in 48h (Pitfall 11 catches this).
- Reports with "stalking," "threatening," or "inappropriate" reasons, handled ad-hoc without a queue.
- Members mentioning they were contacted outside the platform (phone, Instagram DM) after their profile went up.

**Phase to address:** P5 (Trust & Moderation) — block and report tables ship with the contact relay (P4 can't launch publicly without them; they're pre-launch blockers).

---

## Moderate Pitfalls

### Pitfall 16: Postgres timestamp-without-timezone confusion

**What goes wrong:**
`created_at timestamp` (no timezone) stores UTC but reads as if local. An availability field "Saturdays 9am-12pm" written naively gets compared against `NOW()` (which is `timestamptz`) and returns nonsense. "Last updated 3 hours in the future."

**How to avoid:**
- All timestamp columns: `timestamptz`, default `now()`.
- Availability for MVP is free text (already scoped this way). Don't parse it.
- Client renders "time ago" using `date-fns` or `Intl.RelativeTimeFormat` — always off `timestamptz`.

**Phase to address:** P2 (first migration).

---

### Pitfall 17: Migration drift between local and hosted

**What goes wrong:**
Make a schema change in Supabase Studio. Forget to generate migration locally. Next developer (or CI) has a different schema. Breaks auth on deploy.

**How to avoid:**
- `supabase db diff` before every commit that touched the DB.
- Never use Studio for schema changes — only data edits. Schema changes go through `supabase/migrations/*.sql`.
- CI runs `supabase db reset` + `supabase db push --dry-run` on every PR.

**Phase to address:** P1 (repo scaffold) — establish migrations-as-source-of-truth before any table exists.

---

### Pitfall 18: County list drift

**What goes wrong:**
Use a hardcoded list of 159 Georgia counties. Typo in one. Two years later, the state creates a new county (unlikely) or someone notices "DeKalb" vs "Dekalb" inconsistency. Existing profiles reference the misspelled name; filter breaks.

**How to avoid:**
- `counties` table, seeded from the official Georgia Secretary of State list, with ISO-3166-2 county FIPS codes as the stable key (`13001` = Appling).
- `profiles.county_fips` is the foreign key, not `county_name`. Display name lives in the `counties` table.
- Georgia has 159 counties and a published FIPS code for each. The list is stable at MVP timescale.

**Phase to address:** P2 (profile schema).

---

### Pitfall 19: Apple Sign In yields a private-relay email — you cannot contact the user

**What goes wrong:**
User signs up with "Hide My Email." Their email in your DB is `xxxxx@privaterelay.appleid.com`. The relay-email flow (their own account emails) works *if* you registered the sending domain with Apple. But for the contact relay — where *another member* emails *them* — the same domain registration applies since the sender is your platform. It's fine *as long as*:
- You've registered your domain in Apple's Communication Email Service.
- The user hasn't disabled "Forward To My Email" in their Apple ID settings (no way to detect server-side).

Failure mode: user signs up, profile is listed, someone sends them a contact, email hits Apple's relay, Apple drops it (user disabled forwarding or domain unregistered), sender thinks they contacted someone but got no reply.

**How to avoid:**
- Register sending domain with Apple Communication Email Service at P2 (same time as Apple Sign In is enabled in Supabase).
- On the confirmation page after contact-form submit: "The recipient will receive your message within a few minutes. If they don't respond in a week, they may not have seen it."
- Don't promise delivery. Surface the "initiated contact" — not "delivered contact" — in your metric.

**Phase to address:** P2 (Apple config) + P4 (contact expectations in UX).

---

### Pitfall 20: Over-engineered search too early

**What goes wrong:**
Install Typesense or Algolia or pgvector before you have 100 profiles. Now you have an index to keep in sync, extra infra cost, and Postgres full-text search is still fine up to ~10k rows with a GIN index on `to_tsvector`.

**How to avoid:**
- Postgres `tsvector` + GIN index on `display_name || bio || skills` until: (a) directory > 5,000 profiles, OR (b) search latency > 500ms p95.
- Keep search logic in an RPC so swapping to external search later is a function-body change.

**Phase to address:** P3 — Postgres FTS ships with directory. External search = post-MVP.

---

### Pitfall 21: Moderation UI built before anyone reports anything

**What goes wrong:**
Spend P5 building a custom admin dashboard with kanban columns for reports. Launch. Zero reports in first three weeks. UI was premature.

**How to avoid:**
- MVP admin = a SQL query in Supabase Studio saved as a bookmark: `SELECT * FROM reports WHERE resolved_at IS NULL ORDER BY created_at`.
- Email yourself when a report is filed (trigger → edge function → Resend to your inbox). That's the queue.
- Build a real admin UI when you have > 10 reports/week.

**Phase to address:** P5 — trust infra, but admin UI is deliberately last (velocity killer).

---

### Pitfall 22: "What if we need SSO for enterprise later"

**What goes wrong:**
Spend a week engineering an abstraction layer over Supabase Auth "in case we need to swap providers." You'll never swap. The abstraction leaks. You've added complexity for zero current value.

**How to avoid:**
- Use `@supabase/ssr` directly. Write thin helpers (`getAuthedUser`, `requireAuth`, `signOut`) but do not invent an "AuthProvider interface."
- YAGNI until your first real paying B2B customer asks for SAML.

**Phase to address:** P2 — anti-pattern to watch for in PR review.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copy-paste Supabase middleware from a blog post | 15 min saved | Subtle cookie-refresh bugs, hours to diagnose | Never — always use the official [SSR docs](https://supabase.com/docs/guides/auth/server-side/nextjs) template |
| Use `getSession()` instead of `getUser()` on server | Fewer network calls | Security hole, impersonation possible | Never on server; fine in Client Components for instant UI decisions (but re-check on server before data) |
| Ship contact relay without rate limiting | One less table | Spam cannon, Resend suspension, domain reputation loss | Never — rate limits are the feature, not an add-on |
| Hardcode county list in TS file | No migration needed | Typo cascades, no FK integrity | MVP if fewer than 10 counties. Not for Georgia's 159. |
| Skip DMARC at domain setup | DNS moves faster | Silent deliverability degradation over weeks | Never — DMARC monitoring-only (`p=none`) is fine, but have the record |
| Store Apple private-relay emails without domain registration | Launch-day speed | Silent email drops; users appear unreachable | Never — register the domain before enabling Apple Sign In |
| Use Supabase Studio for schema changes instead of migrations | Instant iteration | Drift between local/prod, lost history | During initial schema sketching, before the first public deploy. After that, migrations only. |
| Public avatar bucket | Simpler URLs | Scraping is trivial | OK for MVP since photos are directory-public anyway. Never acceptable for private content (IDs, docs). |
| `export const revalidate = 60` on directory page | Perf win | Stale data after signup | OK *only* if signup flow calls `revalidatePath('/directory')` and profile updates do the same |
| Defer report/block to v1.1 | Less P5 scope | Day-1 harassment; new users churn instantly | Never — block and report are pre-launch blockers |
| Defer ToS / Privacy Policy | Ship faster | App Store rejection, GDPR/CCPA exposure | Never for a user-data product. A one-page Markdown ToS is acceptable MVP content. |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth + Next.js middleware | Constructing new `NextResponse` after reading cookies, losing `Set-Cookie` | Pass the same `NextResponse` through `createServerClient`'s `setAll`; return that exact response |
| Supabase RLS + PostgREST | Helper functions in `public` schema become auto-exposed RPCs | Put helper functions in a `private` schema; only publish intentional RPCs |
| Supabase Storage + public URL | `getPublicUrl` returns a URL that 400s on private buckets; dev "fixes" it by flipping to public | Use `createSignedUrl` for private buckets; accept public bucket only for content members consented to be public |
| Supabase Auth + Apple Sign In | Domain not registered with Apple Communication Email Service; email drops | Register via `developer.apple.com` → Certificates → Services → Communication Email. Do this once per sending domain. |
| Resend + multi-recipient | `to` array or CC counts each address against daily 100 quota | Send one email per recipient; batch only by queueing, never by header |
| Resend + Reply-To abuse | Accepting free-form `Reply-To` from client input | Server-side enforce `Reply-To = authenticated user's verified email`; reject any other value |
| Next.js + Vercel caching | Personalized response cached by CDN | `export const dynamic = 'force-dynamic'` on any route that reads `getUser()` |
| Next.js + server-only secrets | Service key imported into a shared utility also used by client | `import "server-only"` at top of any file touching admin keys |
| Supabase JS + fetch cache | Default fetch cache treats Supabase PostgREST responses as cacheable | Supabase JS client uses its own fetch wrapper that sets `cache: 'no-store'` — don't override with a custom `fetch` |
| Supabase migrations + Studio | Edit schema in Studio, forget to export migration | `supabase db diff -f <name>` after every change; migrations are source of truth |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 on directory cards | Supabase dashboard query count scales with page views × profile count | Single query with PostgREST embedding; RPC if embedding insufficient | ~500 concurrent viewers on free tier |
| RLS policy with expensive `EXISTS` subquery per row | Slow directory list; query plan shows seq scan | Wrap the subquery in a `SECURITY DEFINER` helper function in `private` schema; call it from policy (but review leak surface) | ~10k profiles |
| No index on FTS column | Full-table scan on search | `CREATE INDEX ... USING GIN (to_tsvector(...))` before launch | ~5k profiles |
| No index on `county_fips` or filter columns | Filter queries slow | Standard btree indexes on every column used in WHERE | ~2k profiles |
| Cookie set on every middleware invocation for static assets | Extra Set-Cookie traffic | Middleware `matcher` excludes `/_next/static`, `/_next/image`, `favicon`, `*.png`, etc. | At any scale — it just wastes bandwidth |
| Storage image served at full resolution | Page weight balloons | Supabase Image Transformation on render: `supabase.storage.from('avatars').getPublicUrl(path, { transform: { width: 200 } })` | ~100 profiles on a list page |
| Full directory loaded in one query | Slow first paint | Cursor or offset pagination; `limit = 24`, infinite scroll | ~200 profiles |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Service role key in client bundle | Full DB takeover | `import "server-only"` + CI grep on `.next/static` |
| `getSession()` on server to gate access | JWT spoof / impersonation | `getUser()` only on server; lint rule |
| `USING (true)` in RLS "to unblock dev" | Public read of private data | Review checklist; SQL test suite with anon role |
| View without `security_invoker = true` | RLS bypass via view | Project convention; Supabase Advisor lint |
| Function in `public` schema with `SECURITY DEFINER` | Function auto-exposed as RPC; privilege escalation | Put in `private` schema; `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC` |
| Contact form accepts arbitrary Reply-To | Sender spoofing, phishing | Server-side enforce Reply-To = auth user's verified email |
| No rate limit on contact relay | Spam cannon | Per-sender + per-recipient limits in edge function |
| Profile insert from client (not trigger) | Fake profile rows with arbitrary user_id | `AFTER INSERT ON auth.users` trigger creates profile; client only UPDATEs own row |
| Public bucket policies on RLS | `public = true` bypasses read RLS entirely | Accept public for public content; signed URLs for private |
| Exposing `auth.users` columns via view | PII leak (email, phone, last_sign_in_at) | Profile view exposes only display fields; never join `auth.users` in public APIs |
| Logs containing PII (email, IP) | Unintended retention; GDPR exposure | Vercel/Supabase default logging is short-retention; avoid `console.log(user)` — structured log with user ID only |
| ID enumeration (profile IDs sequential or guessable) | Enumeration attack to scrape everyone | UUIDs, not serial IDs. Already default in Supabase; just don't override. |
| No CSRF on state-changing endpoints | Cross-site form submission | Next.js Server Actions have CSRF built in when used correctly; avoid rolling your own POST endpoints without CSRF tokens |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Empty directory on first visit | Instant bounce, "dead site" perception | Seed 30-50 real profiles pre-launch; beachhead on 2 counties |
| Profile count displayed at "3 members" | Reveals pre-launch scarcity; kills conversion | Don't display count below 50; show category or county instead |
| Signup form with too many fields | Drop-off; SSO undervalued | Google/Apple/magic-link only; profile detail is step 2 |
| Skills field as free text only | Dupes, spelling, canonicalization chaos | Suggested tags (typeahead against existing skill list) + free-text fallback |
| "You must verify your email" with no resend | User stuck if verify link expires | One-click resend; 15-min expiry made explicit |
| Photo upload as the blocker to directory visibility | Reduces profile completeness rate | Default avatar (initial-letter tile); photo is optional but nudged |
| Contact form with no character count | Users write walls of text; recipients skim | 500-char limit, counter visible, plaintext only |
| Contact success page says "Email sent" | False promise for Apple private-relay cases | "Message on the way. You'll hear back if they're interested — give it a few days." |
| No "come back next week" loop | Users sign up and never return | Email digest ("3 new profiles in your county this week") after 1 week, opt-out on the way |
| Hiding county behind radius / precision | Members feel identified in small counties | County is the unit; never show city. In small counties (< 10 profiles), show "South Georgia" region grouping. |
| "Georgia resident" claim implied as verified | Legal/PR risk if non-GA users flood | Landing copy: "Honor-system — members self-attest they're in Georgia. Not verified." |
| Report button hidden in settings | Abuse goes unreported | Report link in every relay email AND on every profile page |
| Block action buries the contact | Victim has to ask for removal | Self-serve block; blocked sender sees "this member isn't accepting contacts" (don't reveal block specifically) |

---

## "Looks Done But Isn't" Checklist

- [ ] **Auth:** `getUser()` is called (not `getSession()`) on every server route touching auth — verify with Grep.
- [ ] **Auth:** Middleware logs out user correctly after 1+ hour idle — verify with Playwright sleep test.
- [ ] **RLS:** Every table has policies for SELECT / INSERT / UPDATE / DELETE explicitly — verify with `pg_policies` query.
- [ ] **RLS:** Every view has `WITH (security_invoker = true)` — verify with `\d+ <view>` in psql.
- [ ] **RLS:** Supabase Database Advisor shows zero red lints — verify in Dashboard.
- [ ] **RLS:** Anon-role `SELECT *` from every public view returns only permitted rows — verify with SQL test.
- [ ] **Service key:** `grep -r service_role .next/static` returns nothing after production build.
- [ ] **Storage:** Avatar upload with filename `../otheruser/overwrite.jpg` is rejected — verify manually.
- [ ] **Storage:** Bucket `file_size_limit` and `allowed_mime_types` are set at the bucket config, not in app code.
- [ ] **Caching:** Page with `getUser()` has `export const dynamic = 'force-dynamic'` — verify with Grep.
- [ ] **Email:** SPF, DKIM, DMARC records resolve and pass — verify with `dig` + mail-tester.com.
- [ ] **Email:** Sending domain registered with Apple Communication Email Service — verify in Apple Developer portal.
- [ ] **Email:** Contact-form Reply-To is server-assigned from auth user, never from request body — verify code path.
- [ ] **Rate limit:** Same sender → same recipient is blocked after 1 message/24h — verify with two curl calls.
- [ ] **Rate limit:** Same sender hits 5/24h total cap — verify with scripted test.
- [ ] **Block:** Blocked sender cannot send to blocker — verify end-to-end.
- [ ] **Report:** Report creates a row and triggers email to admin — verify end-to-end.
- [ ] **Metric:** "Contact button pressed" event fires and lands in analytics — verify with a test click.
- [ ] **Directory:** First paint shows ≥ 20 profiles or a redirect to category/county chooser. Never shows "3 profiles."
- [ ] **Legal:** ToS and Privacy Policy pages exist at `/terms` and `/privacy`, linked from footer.
- [ ] **Georgia gate:** Signup requires county selection; cannot submit without.
- [ ] **Email verify:** Profile does not appear in directory until `auth.users.email_confirmed_at IS NOT NULL` — verify with SQL filter.
- [ ] **PWA:** `manifest.json` is valid; `npx pwa-asset-generator` icons exist; `Lighthouse → PWA` score ≥ 90.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Service-role key leaked in client bundle | HIGH | 1) Rotate key in Supabase Dashboard immediately. 2) Audit DB audit log for rogue queries in the window. 3) Rebuild + redeploy. 4) Add `server-only` + CI grep to prevent recurrence. |
| RLS policy allowed cross-user read | HIGH | 1) Tighten policy + redeploy. 2) Determine exposure window from logs. 3) Notify affected users if PII leaked (legal obligation varies by state; Georgia's data-breach law applies if PII was disclosed). 4) Add SQL regression test. |
| Supabase auth-helpers-nextjs in use in prod | MEDIUM | 1) Branch; migrate imports per [Supabase migration guide](https://supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers). 2) Test login/logout flows end-to-end. 3) Ship. Expect 2-4 hours for a small app. |
| Resend account suspended for bounce/spam | MEDIUM | 1) Don't switch providers immediately — this signals badly. 2) Identify source of bounces (usually a bad list or a spammy sender). 3) Tighten sender eligibility (require email_verified + 24h cooldown). 4) Reply to Resend's warning email with remediation. Most suspensions are reversed in <48h. |
| Directory flooded with spam / commercial listings | MEDIUM | 1) Activate keyword flag in bulk: `UPDATE profiles SET is_visible = false WHERE bio ~* '$|hourly|cash'`. 2) Manually review flagged. 3) Send "please revise" email; give 72h. 4) Ship the keyword flag to the profile editor so new signups hit it immediately. |
| Contact relay used for harassment against one member | LOW-MEDIUM | 1) Immediately issue a platform-level block on sender (admin-set). 2) Suspend sender's account pending review. 3) Email the harassed member that action was taken. 4) If pattern: tighten default rate limits for all users. |
| Apple Sign In users cannot receive mail (domain not registered) | LOW | 1) Register domain in Apple Communication Email Service. 2) Propagation is near-instant. 3) Email affected users (if you have their relay address): "Please try contact again." 4) No data loss — just a delivery window. |
| Cold start: empty directory after public launch | HIGH (reputation) | 1) Quietly pull back paid acquisition; don't burn budget against an empty UX. 2) Double down on personal outreach; target one county + one category until 50 profiles. 3) Re-launch with a narrative ("We quietly onboarded 50 members in Chatham County; now opening to Savannah / Brunswick / Statesboro"). |
| Georgia-only gate defeated by non-GA signups en masse | LOW | 1) Add light friction: IP geolocation soft warning ("We notice you're outside Georgia — this directory is for Georgia residents"). 2) Never hard-block. 3) If abuse continues, require county + county-photo (local landmark) as a v1.1 trust badge. Do not add phone verification reactively. |
| Migration drift breaks prod deploy | LOW | 1) `supabase db pull` to capture prod schema into a migration. 2) Commit. 3) Fix the conflict locally. 4) Establish: no Studio schema changes ever again. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. `getSession()` on server | P2 | Grep `getSession(` in `app/**/*.ts{,x}` returns zero |
| 2. Service-role key leak | P2 | `grep -r service_role .next/static` empty after `next build` |
| 3. `auth-helpers-nextjs` instead of `@supabase/ssr` | P1 | `package.json` does not contain `auth-helpers` |
| 4. Middleware cookie handling | P2 | Playwright test: login → wait 65 min (or mock expiry) → navigate → still authed |
| 5. RLS bypass via views/RPCs | P3 | All views have `security_invoker = true`; private helper functions in `private` schema; Supabase Advisor green |
| 6. Default-allow RLS insert/update | P2 | `pg_policies` shows explicit policies for all 4 commands on every RLS-enabled table |
| 7. `auth.uid()` vs `profiles.id` confusion | P2 | Convention: `profiles.id references auth.users(id)`; documented in repo README |
| 8. Storage bucket misconfig | P2 | Manual test: upload with path traversal fails; MIME and size enforced at bucket level |
| 9. Caching leaks auth state | P3, P4 | Grep confirms `force-dynamic` on routes calling `getUser()`; two-user cache test passes |
| 10. N+1 on directory | P3 | Directory page issues ≤ 2 Supabase queries; load test 100 concurrent < 3s |
| 11. Spam cannon via relay | P4 | Rate-limit rows in DB; curl-flood test blocked at 5th send |
| 12. SPF/DKIM/DMARC + Apple domain | P1 (DNS), P2 (Apple config), P4 (verify) | mail-tester score ≥ 9; Apple Developer portal shows domain verified |
| 13. Empty directory cold start | P6 | 50 seeded profiles before public launch; 1 contact per 10 profiles per week target |
| 14. Commercial / cash creep | P1 (copy), P2 (no rate field), P5 (keyword flag) | No `$` / `hourly` / `cash` terms in top 20 most-viewed profiles; Terms enforce skill-for-skill |
| 15. First-contact harassment | P4 + P5 (ship together) | `blocks` and `reports` tables live pre-launch; report link in every relay email |
| 16. Timestamp timezone | P2 | All timestamp columns are `timestamptz` |
| 17. Migration drift | P1 | CI runs `supabase db reset && supabase db push --dry-run` on every PR |
| 18. County list drift | P2 | `counties` table seeded from FIPS; profile FK to `county_fips` |
| 19. Apple private-relay delivery | P2, P4 | Domain registered in Apple Communication Email Service; UX copy sets expectation |
| 20. Premature search infra | P3 | Postgres FTS only until directory > 5k profiles |
| 21. Premature moderation UI | P5 | Admin = SQL bookmark + email alert until > 10 reports/week |
| 22. YAGNI auth abstractions | P2 | `@supabase/ssr` used directly; no custom "AuthProvider" interface |

---

## Solo-Builder Velocity Killers (explicit)

Each of these kills a week you cannot afford:

| Velocity killer | Why it bites | Counter-move |
|-----------------|--------------|--------------|
| Building moderation UI before any reports exist | Two weeks of React for a page nobody opens | MVP admin is `SELECT * FROM reports` in Supabase Studio. Build real UI when you've manually processed 10+. |
| Perfecting landing copy before the app works | Bikeshedding the one thing you're already good at | Copy-lock the landing page after one iteration; move on. Refine post-launch with analytics. |
| Premature Typesense / Algolia / vector search | Expensive + sync complexity | Postgres FTS to 5k profiles. Revisit only when p95 > 500ms. |
| Native iOS / Android before PWA validates | 4+ weeks of shell app for an unvalidated product | PWA. Capacitor when App Store pressure is real (i.e., someone asks). |
| "We might need SSO for enterprise" abstraction over Supabase Auth | One week + lifetime of leakage | Use `@supabase/ssr` directly. YAGNI. |
| In-app chat instead of email relay | WebSocket infra, inbox UI, read receipts — weeks of work | Email relay is the MVP mechanic. Chat post-validation, if users ask. |
| Ratings / reviews / trust score before there are trades | Trust infra for behaviors that don't exist yet | Skip entirely at MVP. Ship in Barter Tools milestone. |
| Complex onboarding flow with tour, progress bar, gamification | Fragile, no evidence it moves activation | Single-screen signup + profile form. Analytics tells you what to fix. |
| Custom email templates with rich HTML | Hours in MJML / React Email | Plain-text or minimal HTML for v1. Rich later when deliverability is solved. |
| Building a referral system pre-launch | Fake currency, no incentive value yet | Post-MVP. Needs member-to-member trust to mean anything. |
| Writing an accessibility audit in week 1 | Premature; product will change | Shadcn/Radix + semantic HTML give you 90% for free. Audit before launch, not before features. |
| Adding feature flags / experiments infrastructure | Weeks of config for zero users | Hardcode branches. Add a flag system only when you're running two variants simultaneously. |

---

## Legal / Compliance Awareness (Lightweight)

Not a lawyer — surface items to prevent obvious mistakes; get real advice before any paid feature:

- **Terms of Service:** Minimum content — platform does not verify members, members trade at their own risk, platform is not party to trades, platform may remove accounts at discretion, governing law = Georgia, no warranty. One page of Markdown is fine MVP.
- **Privacy Policy:** What data collected (email, name, county, skills, photo, IP logs), how used (directory display, email relay), not sold, opt-out via account deletion, contact email for requests. Georgia is a limited-privacy-law state — no statewide equivalent of CCPA — but if you ever scale to CA/EU users, GDPR/CCPA kick in. Design for deletion from day one (`DELETE FROM auth.users` cascades cleanly).
- **CAN-SPAM alignment:** Every platform-sent email (not first-contact relays, which are 1:1) needs a physical address in the footer and an unsubscribe link. The contact relay itself is 1:1 user-triggered and probably out of CAN-SPAM scope, but include "This message was sent via Georgia Barter's contact relay on behalf of [sender]. Reply directly to reach them." — gives recipients the full picture.
- **Apple Sign In:** If Apple Sign In is offered, App Store guidelines (if you wrap with Capacitor later) require it be offered when you offer any other third-party SSO. Offer Google + Apple together. Don't offer Google-only.
- **"Georgia resident" claim:** Don't imply vetting you don't do. "Members self-attest they live in Georgia" is honest. "Verified Georgian community" is not.
- **IRS / barter income reporting:** Per US IRS, bartered services have taxable value. For MVP — where the platform facilitates first contact only and has no visibility into trades — platform is not a party and has no reporting obligation. **The moment you introduce a ledger or any facilitation of value exchange (Barter Tools milestone), re-review.** Barter exchanges are 1099-B reportable if they meet certain thresholds.
- **Minors:** Likely barter directory attracts parents offering childcare, tutoring, etc. Set account minimum age (18+) in ToS; do not allow profiles advertising child-focused services without explicit language on parental presence and references. Child safety is a sharper moderation edge than general community moderation.

---

## Sources

- [Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) — HIGH
- [Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — HIGH
- [Migrating to the SSR package from Auth Helpers](https://supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers) — HIGH
- [Supabase Auth Helpers deprecated notice](https://github.com/supabase/auth-helpers) — HIGH
- [Supabase RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — HIGH
- [Supabase Database Advisor: security_definer_view lint](https://supabase.com/docs/guides/database/database-advisors?lint=0010_security_definer_view) — HIGH
- [Securing your API — Supabase](https://supabase.com/docs/guides/api/securing-your-api) — HIGH
- [Row level security on views — Supabase discussion #1501](https://github.com/orgs/supabase/discussions/1501) — HIGH
- [Restrict access to files in public bucket — Supabase discussion #20270](https://github.com/orgs/supabase/discussions/20270) — HIGH
- [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — HIGH
- [Security and performance risk with getUser and getSession — supabase/auth-js#898](https://github.com/supabase/auth-js/issues/898) — HIGH
- [Supabase getSession insecure warning discussion #32917](https://github.com/orgs/supabase/discussions/32917) — HIGH
- [Common mistakes with the Next.js App Router — Vercel blog](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them) — HIGH
- [Next.js Server/Client Components docs](https://nextjs.org/docs/app/getting-started/server-and-client-components) — HIGH
- [Next.js 15 Caching docs](https://nextjs.org/docs/app/getting-started/caching-and-revalidating) — HIGH
- [Unsolvable cookies() await error with Supabase SSR + Turbopack — next.js discussion #81445](https://github.com/vercel/next.js/discussions/81445) — MEDIUM
- [Resend account quotas and limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits) — HIGH
- [Resend: preventing bounces with Apple private relay](https://resend.com/docs/knowledge-base/sending-apple-private-relay) — HIGH
- [Apple Developer: Communicating using the private email relay service](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js/communicating_using_the_private_email_relay_service) — HIGH
- [Sign In with Apple Private Relay Issue (2025-05 incident)](https://aso.dev/blog/apple-sign-in/) — MEDIUM
- [How to Avoid the Marketplace Cold Start Trap — Markko](https://meetmarkko.com/knowledge/how-to-avoid-the-marketplace-cold-start-trap/) — MEDIUM
- [44 Failed Marketplace Startups — Failory](https://www.failory.com/startups/marketplace-failures) — MEDIUM
- [How to defend against 8 common marketplace attacks — Sharetribe](https://www.sharetribe.com/academy/most-common-marketplace-attacks/) — MEDIUM
- [Trust and safety is not a product edge case — Ben Balter](https://ben.balter.com/2020/08/31/trust-and-safety-is-not-a-product-edge-case/) — MEDIUM
- [Next.js Security: A Complete Guide — Makerkit](https://makerkit.dev/blog/tutorials/nextjs-security) — MEDIUM

---
*Pitfalls research for: Solo-builder community skill-barter directory (Next.js 15 + Supabase + Resend, Georgia-only)*
*Researched: 2026-04-17*
