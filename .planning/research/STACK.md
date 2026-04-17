# Stack Research — Georgia Barter

**Domain:** Member directory / community skills-barter web app (SSO-auth + profile + filterable directory + platform-relayed contact; PWA first, Capacitor later)
**Researched:** 2026-04-17
**Overall confidence:** HIGH on framework/auth/UI/email/data-layer choices (Context7 + official docs verified). MEDIUM on PWA/Capacitor/testing specifics. LOW-flagged items called out inline.

---

## TL;DR — What to install, what to avoid

**Ship with:**
`next@16.2.x` (App Router, Turbopack default, React 19.2) + `@supabase/ssr@0.10.x` + `@supabase/supabase-js@2.103.x` + `tailwindcss@4.x` + `shadcn/ui` (latest CLI, `new-york` style, Tailwind v4 mode) + `react-hook-form@7.66.x` + `zod@4.x` + `@hookform/resolvers@5.x` + `resend@4.x` + `react-email@4.x` + `serwist@9.x` + `@capacitor/core@7.x` + `vitest@3.x` + `@playwright/test@1.x` + `posthog-js@1.x` + `@vercel/analytics@1.x`. Package manager: **pnpm 9** (reliability > speed for solo-builder on free tier). TypeScript 5.7+, Node 20 LTS.

**Hard "do not use":**
- `@supabase/auth-helpers-nextjs` — deprecated, final version 0.15.0, replaced by `@supabase/ssr`.
- `supabase.auth.getSession()` in any server context (middleware/server component/route handler) for trust decisions — always use `supabase.auth.getUser()` server-side, which revalidates the JWT against the Auth server. `getSession()` just reads the cookie and is spoofable.
- `next-pwa` — last meaningful release 2+ years ago, abandoned. Use **Serwist** (its official successor) or ship PWA manually with a tiny service worker.
- Raw hex Tailwind v3 `tailwind.config.js` for this project — v4 is CSS-first (`@theme` directive, `@import "tailwindcss"`). You want the v4 path to match shadcn's current `new-york` defaults and keep the sage/forest/clay tokens as CSS vars.
- Supabase Pro-only features you don't need yet: Storage Image Transformations are Pro-plan-only (free-tier will serve originals — resize on upload with `browser-image-compression` and skip the transform URL until you're on Pro).

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|---|---|---|---|
| **Next.js** | `16.2.x` (currently `16.2.2`, released Apr 1 2026) | App Router framework, server components, server actions, middleware | Next.js 16 was GA in October 2025; 16.2 adds the ~400% faster dev-server rewrite. App Router is production-grade. Turbopack is the default for `next dev` and `next build`. React Compiler is now stable (opt-in). Fits Vercel free tier natively. Pin to `^16.2` — patch freely, bump minor deliberately. (HIGH) |
| **React / React DOM** | `19.2.x` | UI runtime | Next 16 uses React 19.2 as its peer dep; peer-dep warnings from older libs are resolved in 2026. (HIGH) |
| **TypeScript** | `5.7.x` | Type safety | Next 16's baseline; strict mode on by default. (HIGH) |
| **Supabase Postgres** | (managed, Postgres 17) | Primary DB + RLS for owner-edit / authed-read / server-RPC writes | RLS is the right primitive for "profile = row-owned, directory = authed-read." Free tier: 500 MB DB, 5 GB egress, 50k MAU Auth. (HIGH) |
| **Supabase Auth** | (managed) | Google + Apple OAuth + email magic-link + email-verify gate | OAuth providers (Google, Apple) configured in Studio; zero server code for the flow. Magic-link uses `signInWithOtp({ email })`. Email-verified = `user.email_confirmed_at != null` — use this as a predicate in RLS, not just UI. (HIGH) |
| **Supabase Storage** | (managed) | Avatars, skill photos | Same RLS model as DB; public bucket for avatars is fine. Pre-resize on upload for free tier. (HIGH) |
| **@supabase/ssr** | `0.10.x` (currently `0.10.2`) | The only Supabase client wiring for App Router | Replaces the deprecated `@supabase/auth-helpers-nextjs`. Provides `createBrowserClient` + `createServerClient`. Middleware pattern is **mandatory** for session refresh. (HIGH — verified against official docs and Context7) |
| **@supabase/supabase-js** | `2.103.x` (currently `2.103.2`) | Underlying JS client (peer of `@supabase/ssr`) | Latest stable; install alongside `@supabase/ssr`. (HIGH) |
| **Vercel** | Hobby plan | Hosting, edge, image optimization, Analytics | First-class Next.js host, $0 for MVP traffic. Vercel Analytics has a free "Hobby" tier but custom-event limits are tight — pair with PostHog for the contact-button metric. (HIGH) |
| **Tailwind CSS** | `4.x` (`4.1.x` current line) | Styling | v4 is CSS-first: `@import "tailwindcss"` + `@theme` directive. Oxide engine. Lightning CSS built in — no PostCSS autoprefixer/nesting setup. shadcn's current templates ship v4. Keep your sage/forest/clay palette as CSS vars inside `@theme`. (HIGH) |
| **shadcn/ui** | latest CLI (`shadcn@3.x`), `new-york` style, Tailwind v4 mode | Component system | Copy-paste, Radix-powered, fully themeable via CSS vars — lets you bolt on the warm community aesthetic without fighting a component library's tokens. Every primitive now has `data-slot` attrs (v4 refactor). HSL → OKLCH colors by default (nicer gradients with the forest/clay palette). (HIGH) |
| **Resend** | `4.x` SDK + `react-email@4.x` | Transactional email (platform-relayed contact, auth emails) | Free tier: **3,000 emails/month, 100/day**, full API + React Email. Set `reply-to` to the sender's address so recipients reply direct after first contact (the exact MVP mechanic). Pairs with React Email for typed templates. (HIGH) |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---|---|---|---|
| **react-hook-form** | `7.66.x` | Client form state for profile editor, contact-relay form | Use on every form. Pair with Zod resolver. Works cleanly with shadcn's `Form` component. (HIGH) |
| **zod** | `4.x` (major bump shipped 2025) | Schema validation — the single source of truth for profile + contact shapes | Zod 4 is stable: ~10× perf improvements and smaller bundle. Use the same schema on client (via `@hookform/resolvers/zod`) and inside server actions (parse `formData` on the server — see pattern below). (HIGH) |
| **@hookform/resolvers** | `5.x` | Zod ↔ RHF adapter | Standard. (HIGH) |
| **zod-form-data** | `2.x` | Parses `FormData` directly into a Zod schema inside a server action | Use for the contact-relay server action (form posts → action → Resend). Lets the same Zod schema validate on both sides. (MEDIUM — smaller ecosystem; alternative: roll your own `schema.parse(Object.fromEntries(formData))` helper) |
| **react-email** | `4.x` | Typed JSX components for transactional emails | Pass as `react: MyEmail(props)` to `resend.emails.send()`. Keeps the contact-relay email on-brand (sage/forest/clay palette). (HIGH) |
| **@next/third-parties** | matches Next 16 | Google/Apple auth redirects, analytics script loaders if needed | Optional — most auth redirects go through Supabase. (MEDIUM) |
| **@vercel/analytics** | `1.x` | Page-view analytics | Free on Hobby. Drop-in `<Analytics />` component. (HIGH) |
| **posthog-js** + **posthog-node** | `1.x` | Product analytics — the "initiated contacts" metric | Free tier: **1M events/mo**, 5k replays, 1M feature-flag requests. Fire `posthog.capture('contact_initiated', { recipient_county, recipient_category })` from the server action right after Resend returns a success. (HIGH) |
| **browser-image-compression** | `2.x` | Resize avatars client-side before upload | Stay under Storage free-tier egress and skip Pro-plan Image Transformations for MVP. Typical target: 512×512 WebP, <150 KB. (MEDIUM) |
| **lucide-react** | `0.4xx` | Icon set shadcn uses by default | Tree-shaken, one icon per import. (HIGH) |
| **Serwist** | `9.x` (`@serwist/next`) | PWA / service worker generation for Next 16 App Router | **The `next-pwa` successor.** Actively maintained, App-Router-native, works with Turbopack for builds (minor caveat: local PWA dev may need the `--webpack` flag on `next dev`, only affects local testing). (MEDIUM — moving fast, pin exactly) |
| **@capacitor/core + @capacitor/cli + @capacitor/ios + @capacitor/android** | `7.x` | Later: wrap the PWA for App Store / Play Store | Do NOT install yet. When you're ready: add a `next.config.ts` with `output: 'export'` toggle for the Capacitor build target, write a `capacitor.config.ts` with `appId: 'com.georgiabarter.app'`, configure Associated Domains for Apple Universal Links. Plan this, don't build it. (MEDIUM — set aside one day for the wrap when stores matter) |
| **@capacitor/app + @capacitor/browser** | `7.x` | Later: deep link handling for OAuth callbacks inside the wrapped shell | Capacitor's deep-link guide + Supabase's native OAuth pattern; adds ~30 lines. Leave a `lib/auth/native-callback.ts` stub now so future-you knows where it lands. (LOW — don't over-engineer the stub) |

### Development Tools

| Tool | Purpose | Notes |
|---|---|---|
| **pnpm** | `9.x` | Package manager. Disk-efficient, correct peer-dep resolution, best-in-class for a solo-builder free-tier project. Bun is 5×+ faster to install but has subtle compat edges with some Next 16 plugins — **not worth the blast radius on a solo-maintainer stack.** Use pnpm. |
| **Node.js** | `20.x` LTS | Vercel's supported runtime. |
| **ESLint** | `9.x` (flat config) | Comes with `create-next-app`. Use the Next 16 preset + `eslint-config-prettier` to silence stylistic rules. |
| **Prettier** | `3.x` | Default config is fine. Add `prettier-plugin-tailwindcss` so Tailwind classes sort consistently. |
| **Vitest** | `3.x` | Unit tests for utilities, Zod schemas, pure components (RTL). Async server components are NOT supported by Vitest — cover those via Playwright. |
| **@playwright/test** | `1.x` (latest) | E2E for: signup flow (magic-link stubbed), profile create → appear in directory, filter by category+county, contact-button press → email queued. This is where you validate the "initiated contacts" metric actually fires. |
| **supabase CLI** | `1.25.x` | Local dev, migrations, type generation (`supabase gen types typescript`). Run `supabase start` for a local Postgres+Auth+Storage you can test against without touching prod. |
| **Supabase type generation** | (via CLI) | Generate `lib/database.types.ts` on every migration; import into every `createClient<Database>()` call for end-to-end type safety on queries. |
| **turbo** | optional | Skip for MVP. Single-app repo; the complexity isn't worth it. |

---

## Installation

```bash
# 1. Scaffold
pnpm create next-app@latest georgia-barter --typescript --app --tailwind --eslint --src-dir --import-alias "@/*"
cd georgia-barter

# 2. shadcn (Tailwind v4, new-york style)
pnpm dlx shadcn@latest init -t next
pnpm dlx shadcn@latest add button input textarea select form label card avatar dialog sheet badge separator dropdown-menu toast

# 3. Supabase SSR + client
pnpm add @supabase/ssr @supabase/supabase-js

# 4. Forms + validation
pnpm add react-hook-form @hookform/resolvers zod zod-form-data

# 5. Email
pnpm add resend react-email @react-email/components

# 6. Analytics
pnpm add @vercel/analytics posthog-js posthog-node

# 7. PWA (do this after core app works — it's a phase 2+ concern)
pnpm add -D @serwist/next serwist

# 8. Image handling
pnpm add browser-image-compression

# 9. Dev tooling
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
pnpm add -D @playwright/test
pnpm add -D prettier prettier-plugin-tailwindcss

# 10. Supabase local dev (install once globally or via npx)
pnpm add -D supabase
pnpm supabase init
pnpm supabase start   # local Postgres + Auth + Storage on ports 54321-54327

# Capacitor — DO NOT install until the PWA is live and validated
# When ready:
# pnpm add @capacitor/core @capacitor/ios @capacitor/android
# pnpm add -D @capacitor/cli
# pnpm cap init
```

---

## Key setup patterns (prescriptive, not optional)

### `@supabase/ssr` — the three clients

```ts
// lib/supabase/client.ts — browser
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
```

```ts
// lib/supabase/server.ts — server components, route handlers, server actions
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const createClient = async () => {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // called from a Server Component — can't set cookies here; middleware handles refresh
          }
        },
      },
    },
  )
}
```

```ts
// middleware.ts — session refresh + optional route-gating
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // IMPORTANT: always revalidates with Supabase — use this, not getSession()
  const { data: { user } } = await supabase.auth.getUser()

  const protectedPaths = ['/profile', '/directory', '/contact']
  const needsAuth = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p))
  if (needsAuth && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

**Service-role client** (server-only, for admin tasks — e.g., future moderation queue). Never import into a client component.

```ts
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server env only
  { auth: { persistSession: false } },
)
```

### RLS patterns (minimum viable policies for MVP)

```sql
-- profiles: owner can update own row; authed users can read email-verified profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  county text not null,
  display_name text not null,
  bio text,
  avatar_url text,
  skills_offered text[] not null default '{}',
  skills_wanted text[] not null default '{}',
  availability text,
  contact_preference text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Owner can read/insert/update their own row unconditionally
create policy "own_profile_all" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Authed + email-verified users can read published profiles of others
create policy "directory_read" on profiles
  for select using (
    is_published = true
    and auth.uid() is not null
    and (select email_confirmed_at from auth.users where id = auth.uid()) is not null
  );

-- Full-text search column (keep in sync via trigger)
alter table profiles add column search_vector tsvector
  generated always as (
    to_tsvector('english',
      coalesce(display_name,'') || ' ' ||
      coalesce(bio,'') || ' ' ||
      array_to_string(skills_offered, ' ') || ' ' ||
      array_to_string(skills_wanted, ' ')
    )
  ) stored;

create index profiles_search_idx on profiles using gin (search_vector);
create index profiles_county_idx on profiles (county) where is_published;
create index profiles_skills_offered_idx on profiles using gin (skills_offered);
```

### Server actions vs API routes — decision rule

- **Server Action** — profile create/update, publish toggle, contact-relay form submit. Default to server actions.
- **API route** (`app/api/*/route.ts`) — only when you need an externally-callable endpoint (webhooks from Resend, auth callbacks from OAuth, future cron).
- **Never use `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`** — the service role key must stay server-only, no `NEXT_PUBLIC_` prefix.

Server-action pattern with `zod-form-data`:

```ts
// app/(app)/profile/actions.ts
'use server'
import { redirect } from 'next/navigation'
import { zfd } from 'zod-form-data'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const ProfileSchema = zfd.formData({
  display_name: zfd.text(z.string().min(2).max(80)),
  county: zfd.text(z.string().min(2)),
  bio: zfd.text(z.string().max(1000).optional()),
  skills_offered: zfd.repeatableOfType(zfd.text(z.string().min(1))),
  skills_wanted: zfd.repeatableOfType(zfd.text(z.string().min(1))),
})

export async function saveProfile(_state: unknown, formData: FormData) {
  const parsed = ProfileSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, ...parsed.data })
  if (error) return { error: { formErrors: [error.message], fieldErrors: {} } }

  redirect('/profile')
}
```

### Contact-relay via Resend (the MVP's one-and-only email path)

```ts
// app/(app)/members/[id]/contact-action.ts
'use server'
import { Resend } from 'resend'
import { z } from 'zod'
import { zfd } from 'zod-form-data'
import { createClient } from '@/lib/supabase/server'
import { ContactRelayEmail } from '@/emails/contact-relay'
import { PostHog } from 'posthog-node'

const resend = new Resend(process.env.RESEND_API_KEY!)
const posthog = new PostHog(process.env.POSTHOG_KEY!, {
  host: 'https://us.i.posthog.com',
})

const ContactSchema = zfd.formData({
  recipient_id: zfd.text(z.string().uuid()),
  subject: zfd.text(z.string().min(3).max(120)),
  message: zfd.text(z.string().min(20).max(2000)),
})

export async function sendContact(_: unknown, formData: FormData) {
  const parsed = ContactSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email_confirmed_at) return { error: { formErrors: ['Verify your email to send contacts.'], fieldErrors: {} } }

  // Look up recipient via RLS — only returns if recipient is published
  const { data: recipient } = await supabase
    .from('profiles_with_email') // SECURITY DEFINER view that exposes email only to authed users
    .select('email, display_name')
    .eq('id', parsed.data.recipient_id)
    .single()
  if (!recipient) return { error: { formErrors: ['Recipient not available.'], fieldErrors: {} } }

  await resend.emails.send({
    from: 'Georgia Barter <relay@mail.georgiabarter.com>',
    to: [recipient.email],
    replyTo: user.email!,                       // key mechanic — replies go direct after first touch
    subject: `[Georgia Barter] ${parsed.data.subject}`,
    react: ContactRelayEmail({
      recipientName: recipient.display_name,
      senderName: user.user_metadata.full_name ?? user.email!,
      message: parsed.data.message,
    }),
    headers: { 'X-Entity-Ref-ID': crypto.randomUUID() },
  })

  posthog.capture({
    distinctId: user.id,
    event: 'contact_initiated',
    properties: { recipient_id: parsed.data.recipient_id },
  })
  await posthog.shutdown()
  return { success: true }
}
```

Note the SECURITY DEFINER view pattern: emails are never exposed in a directory query — they're revealed only inside a server action that validates sender eligibility. RLS on the base `profiles` table never exposes `email`; the view does, gated by `auth.uid() is not null`.

### Auth provider setup checklist (Supabase Studio → Authentication → Providers)

- **Google**: Client ID + secret from Google Cloud Console; authorized redirect = `https://<project-ref>.supabase.co/auth/v1/callback`. Also add your app origin (`https://georgiabarter.com`) to the Authorized JavaScript Origins.
- **Apple**: Apple Developer account required (Individual or Org), ~$99/yr — flag this as a hard dependency. Create a Services ID, a Sign In with Apple key, sign a client secret JWT. Supabase docs have the generator.
- **Email magic-link**: default provider; swap the SMTP settings to Resend in Studio → Auth → SMTP so magic-link and verification emails come from your domain (stay under Supabase's shared SMTP rate limits and get brand-aligned emails).
- **Redirect URLs**: add `http://localhost:3000/**`, `https://georgiabarter.com/**`, plus a preview-URL wildcard (`https://*-yourteam.vercel.app/**`).
- **Email-verify gate**: Studio → Auth → Settings → "Confirm email" ON. Gate appearance-in-directory on `email_confirmed_at IS NOT NULL` in RLS — do not trust the UI.

### Passkeys — status and recommendation

**LOW confidence on "stable"** as of April 2026. WebAuthn for first-factor sign-in is still not a first-class Supabase Auth primitive; community posts from late 2025 said it was planned for 2025 and integration guides exist, but Supabase's MFA docs still list TOTP as the only stable factor. **For MVP: skip passkeys.** Ship Google + Apple + magic-link. Revisit when Supabase ships official WebAuthn sign-in (watch github.com/orgs/supabase/discussions/8677). If a user really demands passkeys pre-release, the Corbado/Descope integrations work but add a third-party dependency you don't need.

### Search + filter (MVP scale: 100–10,000 profiles)

- **Category filter**: `where category = $1` with a plain btree index.
- **County filter**: same.
- **Keyword search**: Postgres `tsvector` with a GIN index on a generated column (see schema above). At <10k rows this is sub-millisecond.
- **Do not** reach for pgvector, Meilisearch, Algolia, or Elasticsearch until you've proven the directory has pull and the search experience needs fuzzy/semantic matching. The deferred "radius search + availability calendar" milestone will re-open this decision.
- **For "starts-with" autocomplete** on skills (v1.1+ territory): add `pg_trgm` extension + GIN trigram index. Not MVP.

### PWA with Serwist (Next 16 App Router)

```ts
// next.config.ts
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development', // avoid --webpack-on-dev hassle
})

export default withSerwist({
  // standard Next config
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },
})
```

```ts
// app/manifest.ts — typed manifest, Next ships this for you
import type { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Georgia Barter',
    short_name: 'GA Barter',
    description: 'A Georgia skills-barter directory.',
    start_url: '/',
    display: 'standalone',
    background_color: '#eef3e8', // --sage-bg
    theme_color: '#2d5a27',       // --forest
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

**iOS install quirks (Safari):** no `beforeinstallprompt` event on iOS — you must show a "tap Share → Add to Home Screen" explainer after N visits. Add `<meta name="apple-mobile-web-app-capable" content="yes">` and `<link rel="apple-touch-icon" href="/icon-180.png">` via `app/layout.tsx` metadata. Test with `window.navigator.standalone` to detect installed-on-iOS state (different from the web-standard `matchMedia('(display-mode: standalone)')`).

### Fonts — Lora + Inter via `next/font/google`

```ts
// app/layout.tsx
import { Inter, Lora } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const lora  = Lora({ subsets: ['latin'], variable: '--font-serif', display: 'swap' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body className="font-sans bg-[var(--sage-bg)] text-[var(--forest-deep)]">{children}</body>
    </html>
  )
}
```

Wire the variables into Tailwind v4's `@theme`:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-sage-bg:    #eef3e8;
  --color-sage-light: #dfe8d5;
  --color-sage-pale:  #f4f7f0;
  --color-forest:     #2d5a27;
  --color-forest-deep:#1e4420;
  --color-forest-mid: #3a7032;
  --color-clay:       #c4956a;

  --font-sans: var(--font-sans), system-ui, sans-serif;
  --font-serif: var(--font-serif), Georgia, serif;
}
```

Next 16 self-hosts Google Fonts at build — zero requests to Google at runtime, no layout shift.

### Capacitor upgrade path — what to set up now

You don't install Capacitor yet, but you **should** make three low-cost decisions now so the later wrap is clean:

1. **Pick the app ID**: `com.georgiabarter.app` — reserve it mentally; it lives in `capacitor.config.ts` and the iOS/Android project files and can't change easily.
2. **Put OAuth callback handling behind a small abstraction**: in `lib/auth/oauth.ts`, have one function `signInWithProvider(provider)` that in web mode calls `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })` and in a future native-detected branch uses the `@capacitor/browser` flow. Wire it as web-only now; add the native branch when you add Capacitor.
3. **Don't hardcode `https://georgiabarter.com/` in email templates** — use an env var `NEXT_PUBLIC_SITE_URL`. When you add deep links (`app.georgiabarter://auth/callback`), you'll need to swap the magic-link redirect target based on user-agent; env-var-first makes that trivial.

Plan the wrap itself as "one-day project":
- `pnpm add @capacitor/core @capacitor/ios @capacitor/android` + CLI
- `npx cap init "Georgia Barter" "com.georgiabarter.app"`
- `next.config.ts`: add an `output: 'export'` mode gated on `process.env.BUILD_TARGET === 'capacitor'`
- Build → copy `out/` into Capacitor → `npx cap add ios && npx cap sync ios`
- Configure Apple Universal Links via Associated Domains; use `@capacitor/app`'s `appUrlOpen` to route magic-link and OAuth callbacks back into the right Next route.

### Analytics — what fires the "initiated contacts" event

- **Vercel Web Analytics** (`<Analytics />` from `@vercel/analytics/next`): page views, Core Web Vitals, free. Custom-event volume on Hobby is limited — don't rely on it for the primary metric.
- **PostHog** (`posthog-node` for server-side, `posthog-js` for client-side): fire `contact_initiated` server-side from inside the contact-relay action (see code above). 1M events/mo free. Add funnel: landing → signup → profile → contact_initiated.
- **Don't run Google Analytics** — the warm-community brand doesn't need GA, and skipping it avoids a cookie-consent banner on day one.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|---|---|---|
| Next.js 16 App Router | Remix / Astro | Never for this project — you want RSC + server actions + Vercel-native. |
| Supabase (Auth + Postgres + Storage) | Clerk + Convex / Clerk + Neon / Auth.js + Neon | Only if you'd outgrown Supabase's single-region Postgres. For a Georgia-only directory at MVP scale, Supabase is strictly better (one vendor, one bill, RLS is the right primitive for the ledger milestone that comes later). |
| `@supabase/ssr` | NextAuth/Auth.js on top of Supabase-as-DB | Only if you needed enterprise SAML or exotic identity brokering — Supabase Auth covers Google+Apple+email-OTP out of the box. |
| Tailwind v4 + shadcn/ui | Mantine / Chakra / MUI / Radix UI standalone | Chakra/MUI/Mantine lock you to their token systems — you'd fight them for the sage/forest/clay aesthetic. Radix-standalone is what shadcn wraps; use shadcn instead. |
| React Hook Form + Zod + server actions | TanStack Form / Formik / plain useState | RHF is the boring-and-correct choice; Formik is legacy; TanStack Form is powerful but young. |
| Resend | Postmark / SendGrid / AWS SES | Postmark is the deliverability-king alternative ($15/mo floor, no free tier suitable for MVP). SES is cheapest at scale but has sandbox → production escalation + you own DKIM/SPF wiring. Use Resend for MVP; reconsider at 3k+ emails/mo if cost becomes a factor. |
| Supabase's default email SMTP | Resend as Supabase SMTP | **Do both**: in Supabase Studio → Auth → SMTP, plug in Resend as the SMTP backend for magic-link + verify emails. This removes Supabase's shared-IP rate-limits and puts auth emails on your brand domain. |
| Serwist | Ship no PWA for MVP | Valid variant if install-to-home-screen is not a launch requirement. Ship the manifest anyway (it costs nothing) and add Serwist when you want offline view / push notifications. |
| pnpm | Bun | Bun is 5×+ faster for `install`, but compatibility edges (e.g. some Next.js plugins, some Supabase CLI behaviors) are not zero. Solo-maintainer cost of debugging a Bun quirk > savings. Use pnpm. |
| Vitest + Playwright | Jest + Cypress | Jest's ESM story still requires config gymnastics with Next 16; Vitest runs out of the box. Cypress is fine but Playwright handles Safari/WebKit natively (important for iOS PWA testing). |
| PostHog | Plausible / Umami / Fathom | Those are page-view-only — fine as a GA replacement, but they won't support the `contact_initiated` custom event with enough depth to build funnels from. Use PostHog. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|---|---|---|
| `@supabase/auth-helpers-nextjs` | **Deprecated.** Final version 0.15.0, no further updates. Does not handle Next 15/16 `cookies()` API changes cleanly. | `@supabase/ssr@0.10.x` |
| `supabase.auth.getSession()` in middleware / RSC / server actions for trust | Reads the cookie without revalidating — attacker with cookie contents can spoof. | `supabase.auth.getUser()` — revalidates against Supabase Auth. Use `getSession()` only in client components for quick UI state. |
| `next-pwa` | Unmaintained (2+ years). Doesn't officially support App Router or Turbopack. | `@serwist/next` (its successor) |
| Storing images with Supabase Storage Image Transformations | Pro-plan-only. Free tier can't resize on the fly. | Resize client-side with `browser-image-compression` before upload. Swap to transformations when on Pro. |
| Tailwind v3 `tailwind.config.js` as the source of truth | v4 moves theme to CSS-first `@theme` directive. shadcn templates assume v4. | `@import "tailwindcss"` + `@theme { --color-*: ...; }` |
| Bun as package manager for this stack | Solo-builder + fast-moving Next/Supabase ecosystem = too many ways to get silently wedged. | pnpm 9 |
| Google Analytics 4 | Overkill, cookie-consent burden, not the metric you care about. | PostHog for the one event that matters. |
| Embedding the recipient's email in a public directory page | Privacy principle violation per the project constraints. | SECURITY DEFINER view + server-action relay. |
| Passkey-only sign-in for MVP | Supabase WebAuthn is still not a stable first-factor. | Google + Apple + magic-link; add passkey support once Supabase's first-party story lands. |
| A custom `/api/auth/callback` that manipulates cookies by hand | `@supabase/ssr` ships the correct pattern — don't reinvent. | The `createServerClient` + middleware pattern above. |
| Storing `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix | Leaks the god-mode key to the browser. | Server-env only, no prefix. |

---

## Stack Patterns by Variant

**If you decide to ship iOS/Android stores within 3 months of web launch:**
- Skip Serwist entirely for MVP — Capacitor has its own caching/offline story.
- Still ship the PWA manifest so web-install works.
- Budget the Capacitor wrap as a named 1–2 day milestone.

**If the directory takes off beyond 10k profiles and filters feel slow:**
- Add `pg_trgm` for fuzzy keyword matching (skills with typos).
- Move the search endpoint from a server component that queries directly to a cached route handler with `unstable_cache` + tag-invalidation on profile upsert.
- Only then consider Algolia / Meilisearch.

**If you want to reduce Resend dependency later:**
- Wrap `sendContact` behind a local `emails/send.ts` abstraction now so swapping to Postmark / SES is a file-change, not an app-wide refactor.

---

## Version Compatibility Matrix

| Package A | Compatible With | Notes |
|---|---|---|
| `next@16.2.x` | `react@19.2.x` + `react-dom@19.2.x` | Peer-dep warnings from ecosystem libs have largely resolved by April 2026. |
| `@supabase/ssr@0.10.x` | `@supabase/supabase-js@2.x` | Install both; `@supabase/ssr` imports from `supabase-js`. |
| `tailwindcss@4.x` | `@tailwindcss/postcss@4.x` OR `@tailwindcss/vite` | Next 16 uses the PostCSS plugin via `postcss.config.mjs`. shadcn init handles this. |
| `shadcn@3.x` CLI | `tailwindcss@4.x` + `react@19.x` | `new-york` style defaults, Tailwind v4 mode. Older shadcn components scaffolded for Tailwind v3 still compile but won't get the `data-slot` refactor. |
| `zod@4.x` | `@hookform/resolvers@5.x` | Resolvers v5 is the Zod-4-compatible line. |
| `react-hook-form@7.66.x` | `@hookform/resolvers@5.x` + `zod@4.x` | Standard combo. |
| `resend@4.x` | `react-email@4.x` + `@react-email/components@0.1.x` | Pass React components via `react: MyEmail(props)` — as a call, not as JSX. |
| `serwist@9.x` | `next@16.x` | Works with Turbopack for `build`. For `next dev` PWA testing, disable PWA in dev (see `next.config.ts` snippet) OR use `next dev --webpack`. |
| `@capacitor/core@7.x` | Next export mode (`output: 'export'`) | Turn export mode on only for the Capacitor build; keep SSR for Vercel. |
| Supabase Free tier | 500 MB DB, 5 GB egress, 50k MAU | Monitor egress — image delivery will eat it first. Mitigation: resize on upload + set long cache headers on avatar URLs. |
| Resend Free tier | 3,000/mo, 100/day | Plenty for MVP launch. Alert yourself at 2,500/mo. |
| PostHog Free tier | 1M events/mo | Effectively unlimited for this app. |
| Vercel Hobby | Commercial use not permitted; personal projects only | If Georgia Barter monetizes, move to Pro ($20/mo). Keep this in mind — Hobby ≠ free forever for commercial traffic. |

---

## Confidence Summary

| Area | Confidence | Notes |
|---|---|---|
| Next.js 16 + App Router + Turbopack | HIGH | Verified against Context7 `/vercel/next.js` + Next 16 blog post + Apr 2026 release notes. |
| `@supabase/ssr` over `auth-helpers` | HIGH | Verified — auth-helpers repo explicitly marked "now deprecated", `@supabase/ssr@0.10.2` is the live line. |
| Supabase Auth: Google + Apple + magic-link | HIGH | Verified via Supabase docs + Context7 `/websites/supabase`. |
| Supabase Auth: Passkeys | **LOW** — flag | Community signals in late-2025 said "coming 2025", but stable first-factor WebAuthn is not documented as GA in April 2026. Skip for MVP. |
| Tailwind v4 + shadcn/ui | HIGH | Verified via shadcn changelog (May 2025 new-site on Next 15.3 + Tailwind v4; Feb 2025 Tailwind-v4 shadcn changelog). |
| React Hook Form + Zod 4 + zod-form-data | HIGH on RHF+Zod, MEDIUM on zod-form-data | zod-form-data works but is a smaller ecosystem; alternative is a one-line `Object.fromEntries(formData)` helper. |
| Resend + React Email | HIGH | Free tier and API verified. |
| Serwist for PWA | MEDIUM | Maintained, App-Router-native, but newer than `next-pwa` — pin exact version and revisit on Next 17. |
| Capacitor 7 plan | MEDIUM | Documented patterns exist; actual wrap hasn't been done in this repo — budget a full day the first time. |
| Postgres FTS for directory search at 10k scale | HIGH | Benchmarks (Supabase's own blog, pg_trgm docs) confirm sub-10ms GIN-indexed FTS at 10k–150k rows. |
| pnpm over Bun | MEDIUM | Opinion based on solo-maintainer-risk; both work. |
| Vitest + Playwright split | HIGH | Next's own testing guide recommends this exact split. |
| PostHog for "initiated contacts" metric | HIGH | 1M events/mo free tier + first-party Next.js adapter. |

---

## Migrations-in-Flight to Watch

- **Serwist** is newer than `next-pwa` ever was — pin the minor version and re-verify at each Next major bump.
- **Supabase WebAuthn/passkeys** — if you want passkeys for v1.1, watch Supabase GitHub discussions #8677 and #9216 for the GA announcement.
- **Next.js 16 Turbopack as default** — the dev-server rewrite in 16.2 is new; if you hit weirdness, `next dev --webpack` is the escape hatch.
- **React Compiler** — stable in Next 16 but still opt-in. Skip for MVP, consider enabling after launch stability is proven.
- **Tailwind v4 OKLCH color space** — if any brand assets were designed assuming sRGB HSL exactly, do a quick visual check; OKLCH interpolation of the forest→clay gradient looks different (often better).

---

## Sources

**Context7 (HIGH trust):**
- `/vercel/next.js` — Next.js 16 App Router, server actions, middleware auth patterns
- `/supabase/ssr` — `createBrowserClient`, `createServerClient`, middleware session refresh, Next.js App Router integration
- `/websites/supabase` — Auth providers, MFA status, OAuth + magic-link patterns
- `/supabase/supabase-js` — v2.103.x client reference
- `/shadcn-ui/ui` — Tailwind v4 migration changelog, Next.js installation, `new-york` style
- `/tailwindlabs/tailwindcss.com` — v4 CSS-first configuration, `@theme` directive, Lightning CSS integration
- `/websites/resend` — `reply-to` header, React Email integration, send patterns
- `/react-hook-form/react-hook-form` — v7.66.x + Zod resolver
- `/colinhacks/zod` — Zod 4 stable

**Official docs (HIGH trust):**
- https://nextjs.org/blog/next-16 — Next 16 GA (Oct 2025)
- https://nextjs.org/docs/app/guides/upgrading/version-16 — upgrade guide
- https://nextjs.org/docs/app/guides/progressive-web-apps — PWA guide (recommends Serwist)
- https://github.com/supabase/auth-helpers — deprecation notice, final version 0.15.0
- https://supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers — migration guide
- https://supabase.com/docs/guides/database/full-text-search — FTS recommendation for small-to-medium corpora
- https://supabase.com/docs/guides/storage/serving/image-transformations — Pro-only feature note
- https://resend.com/pricing — free-tier confirmation (3000/mo, 100/day)
- https://posthog.com/pricing — 1M events/mo free-tier confirmation
- https://capacitorjs.com/docs/guides/deep-links — iOS Universal Links setup
- https://ui.shadcn.com/docs/tailwind-v4 — Tailwind v4 migration for shadcn

**WebSearch (verified against above, MEDIUM trust where noted):**
- Release Bot + Medium/LogRocket posts confirming Next.js 16.2.2 on Apr 1 2026
- Corbado/Descope blog posts + GitHub discussion #8677 on Supabase passkey status (LOW trust — used only to flag passkeys as NOT YET stable)
- LogRocket + Aurora Scharff posts on Serwist for Next 16 PWA (MEDIUM trust — Serwist is the community-recommended replacement)

---

*Stack research for: Georgia Barter — Georgia-only community skills-barter directory (directory-first MVP, PWA, Capacitor-later)*
*Researched: 2026-04-17*
