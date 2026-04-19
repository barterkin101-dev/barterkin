---
plan: "03b"
phase: 2
name: pages
wave: 2
depends_on: [1, "03a"]
autonomous: true
requirements:
  - AUTH-01
  - AUTH-02
  - AUTH-04
  - AUTH-05
  - AUTH-08
  - AUTH-09
  - AUTH-10
  - GEO-04
files_modified:
  - app/(auth)/layout.tsx
  - app/(auth)/login/page.tsx
  - app/(auth)/signup/page.tsx
  - app/verify-pending/page.tsx
  - app/legal/tos/page.tsx
  - app/legal/privacy/page.tsx
  - app/legal/guidelines/page.tsx
  - components/layout/Footer.tsx
  - app/layout.tsx
must_haves:
  truths:
    - "/login and /signup render with GoogleAuthBlock, Separator, LoginForm, legal microcopy, and cross-link"
    - "/verify-pending renders 'One more step' heading with ResendLinkButton routing back to /login?email=prefill"
    - "/legal/tos renders with H1 'Terms of Service' and contains the locked GEO-04 Georgia non-residency clause verbatim"
    - "/legal/privacy renders with H1 'Privacy Policy' and the UI-SPEC-locked sections"
    - "/legal/guidelines renders with H1 'Community Guidelines' and the UI-SPEC-locked sections"
    - "Footer appears on every route with Terms/Privacy/Guidelines links and LogoutButton for authed users"
  artifacts:
    - path: "app/(auth)/layout.tsx"
      provides: "Centered-card layout for /login, /signup"
      exports: ["default"]
    - path: "app/(auth)/login/page.tsx"
      provides: "Login page surface (AUTH-01 + AUTH-02 + AUTH-08)"
      exports: ["default"]
    - path: "app/(auth)/signup/page.tsx"
      provides: "Signup page surface (AUTH-01 + AUTH-02 + AUTH-08)"
      exports: ["default"]
    - path: "app/verify-pending/page.tsx"
      provides: "Email-verify gate surface (AUTH-04 UX)"
      exports: ["default"]
    - path: "app/legal/tos/page.tsx"
      provides: "Terms of Service prose with locked GEO-04 clause"
      contains: "Georgia residents"
    - path: "app/legal/privacy/page.tsx"
      provides: "Privacy Policy prose"
      exports: ["default"]
    - path: "app/legal/guidelines/page.tsx"
      provides: "Community Guidelines prose"
      exports: ["default"]
    - path: "components/layout/Footer.tsx"
      provides: "Site-wide footer with legal links + Sign in/Log out"
      exports: ["Footer"]
  key_links:
    - from: "app/(auth)/login/page.tsx"
      to: "components/auth/GoogleAuthBlock.tsx"
      via: "<GoogleAuthBlock /> render"
      pattern: "<GoogleAuthBlock"
    - from: "app/(auth)/login/page.tsx"
      to: "components/auth/LoginForm.tsx"
      via: "<LoginForm /> render"
      pattern: "<LoginForm"
    - from: "app/(auth)/signup/page.tsx"
      to: "components/auth/GoogleAuthBlock.tsx"
      via: "<GoogleAuthBlock /> render"
      pattern: "<GoogleAuthBlock"
    - from: "app/(auth)/signup/page.tsx"
      to: "components/auth/LoginForm.tsx"
      via: "<LoginForm /> render"
      pattern: "<LoginForm"
    - from: "app/verify-pending/page.tsx"
      to: "components/auth/ResendLinkButton.tsx"
      via: "<ResendLinkButton email={email} />"
      pattern: "<ResendLinkButton"
    - from: "app/layout.tsx"
      to: "components/layout/Footer.tsx"
      via: "<Footer /> render"
      pattern: "<Footer"
    - from: "components/layout/Footer.tsx"
      to: "components/auth/LogoutButton.tsx"
      via: "<LogoutButton /> render for authed users"
      pattern: "<LogoutButton"
---

## Objective

Wave 2 UI — part (b): assemble the public page surfaces and wire the site-wide Footer. All components consumed here were built in Plan 02-03a.

1. `(auth)/layout.tsx` + `(auth)/login/page.tsx` + `(auth)/signup/page.tsx` — auth pages (AUTH-01 + AUTH-02 + AUTH-08 + AUTH-09).
2. `app/verify-pending/page.tsx` — UX gate page (AUTH-04).
3. Three legal pages — ToS with GEO-04 locked clause, Privacy, Guidelines (AUTH-10 + GEO-04).
4. Site-wide Footer wired into root layout (AUTH-10 microcopy + AUTH-05 logout placement).

Split rationale: see 02-03a Objective.

**Purpose:** Honor user decisions D-AUTH-09 (auth route group), D-AUTH-10 (legal pages linked from signup + footer), D-GEO-04 (Georgia non-residency clause in ToS). All exact copy is UI-SPEC-locked.

**Output:** Every UI-SPEC surface renders; Wave 3 fills test bodies against them.

## Threat Model

| Boundary | Description |
|----------|-------------|
| Page render → claims | `getClaims()` (JWKS-verified) is the only trust source for rendering authed UI |
| Footer logout form → /auth/signout | Plain HTML `<form method="POST">` — no JS required, no CSRF token needed (same-origin cookie-bound) |

### STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2-08 | Elevation of Privilege | `user_metadata.email_verified` used in Footer | mitigate | Footer uses `claims.sub` only (for "is authed" check); never reads user_metadata for trust decisions |

## Tasks

<task id="2-3b-1" type="auto">
  <title>Task 3b.1: app/(auth)/layout.tsx + login page + signup page</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (Login Page + Signup Page sections)
    - `.planning/phases/02-authentication-legal/02-PATTERNS.md` ((auth)/layout.tsx, lines 229–255; login/signup pages, lines 179–227)
    - `app/layout.tsx` (existing root layout — layout nesting rule: (auth) does NOT re-emit <html>/<body>)
    - `components/auth/GoogleAuthBlock.tsx` (from 02-03a Task 3a.3)
    - `components/auth/LoginForm.tsx` (from 02-03a Task 3a.4)
  </read_first>
  <action>
Create three files.

**File 1: `app/(auth)/layout.tsx`**

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Sign in — Barterkin', template: '%s — Barterkin' },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center py-16 px-6 bg-sage-bg">
      {children}
    </main>
  )
}
```

Note: (auth) layout does NOT emit `<html>`/`<body>`. That's the root layout's job. Next.js will nest this inside the root layout automatically.

**File 2: `app/(auth)/login/page.tsx`** (server component)

```tsx
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LoginForm } from '@/components/auth/LoginForm'
import { GoogleAuthBlock } from '@/components/auth/GoogleAuthBlock'

export const metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <Card className="max-w-[400px] w-full bg-sage-pale border-sage-light">
      <CardHeader>
        <CardTitle className="font-serif text-2xl font-bold leading-[1.2]">
          Welcome to Barterkin
        </CardTitle>
        <CardDescription className="text-base leading-[1.5] text-muted-foreground">
          Sign in to find and offer skills in your Georgia community.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <GoogleAuthBlock />

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <LoginForm />

        <p className="text-sm text-muted-foreground text-center">
          By continuing, you agree to our{' '}
          <Link href="/legal/tos" className="underline">Terms of Service</Link>,{' '}
          <Link href="/legal/privacy" className="underline">Privacy Policy</Link>, and{' '}
          <Link href="/legal/guidelines" className="underline">Community Guidelines</Link>.
        </p>

        <p className="text-sm text-center">
          New here?{' '}
          <Link href="/signup" className="underline">Create an account</Link>
        </p>
      </CardContent>
    </Card>
  )
}
```

**File 3: `app/(auth)/signup/page.tsx`** — structurally identical to login, different copy:

```tsx
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LoginForm } from '@/components/auth/LoginForm'
import { GoogleAuthBlock } from '@/components/auth/GoogleAuthBlock'

export const metadata = { title: 'Create an account' }

export default function SignupPage() {
  return (
    <Card className="max-w-[400px] w-full bg-sage-pale border-sage-light">
      <CardHeader>
        <CardTitle className="font-serif text-2xl font-bold leading-[1.2]">
          Welcome to Barterkin
        </CardTitle>
        <CardDescription className="text-base leading-[1.5] text-muted-foreground">
          Create an account to join the Georgia skills-barter directory.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <GoogleAuthBlock />

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <LoginForm />

        <p className="text-sm text-muted-foreground text-center">
          By continuing, you agree to our{' '}
          <Link href="/legal/tos" className="underline">Terms of Service</Link>,{' '}
          <Link href="/legal/privacy" className="underline">Privacy Policy</Link>, and{' '}
          <Link href="/legal/guidelines" className="underline">Community Guidelines</Link>.
        </p>

        <p className="text-sm text-center">
          Already have an account?{' '}
          <Link href="/login" className="underline">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  )
}
```

Magic-link is passwordless — signup and sign-in use identical forms; difference is copy only. Google OAuth handles new vs. existing account transparently.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm build && grep -q "Welcome to Barterkin" app/\(auth\)/login/page.tsx && grep -q "Welcome to Barterkin" app/\(auth\)/signup/page.tsx && grep -q "Sign in to find and offer skills" app/\(auth\)/login/page.tsx && grep -q "Create an account to join" app/\(auth\)/signup/page.tsx</automated>
  </verify>
  <done>
    - `app/(auth)/layout.tsx` exists; does NOT contain `<html>` or `<body>` (grep must not match `<html`)
    - `app/(auth)/login/page.tsx` exists; greps match "Welcome to Barterkin", "Sign in to find and offer skills", "New here?", and all three legal links
    - `app/(auth)/signup/page.tsx` exists; greps match "Create an account to join", "Already have an account?"
    - `pnpm typecheck && pnpm build` pass
  </done>
</task>

<task id="2-3b-2" type="auto">
  <title>Task 3b.2: app/verify-pending/page.tsx — AUTH-04 UX gate page</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (Verify-Pending Page copy, lines 148–161 — LOCKED verbatim)
    - `lib/supabase/server.ts` (for reading claims.email on server)
    - `components/auth/ResendLinkButton.tsx` (from 02-03a Task 3a.5)
    - `components/auth/LogoutButton.tsx` (from 02-03a Task 3a.5)
  </read_first>
  <action>
Create `app/verify-pending/page.tsx`. Displays the UI-SPEC-locked copy and provides a Resend CTA.

```tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { ResendLinkButton } from '@/components/auth/ResendLinkButton'

export const metadata = { title: 'Verify your email — Barterkin' }

/**
 * AUTH-04: Email-verify UX gate.
 * Rendered when middleware redirects an authed-but-unverified user here.
 * Copy locked in 02-UI-SPEC.md lines 148–161.
 */
export default async function VerifyPendingPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const email = (data?.claims?.email as string | undefined) ?? 'your inbox'

  return (
    <main className="min-h-screen flex items-center justify-center py-16 px-6 bg-sage-bg">
      <Card className="max-w-[480px] w-full bg-sage-pale border-sage-light">
        <CardHeader className="space-y-6">
          <h1 className="font-serif text-3xl md:text-[32px] font-bold leading-[1.15]">
            One more step
          </h1>
          <h2 className="font-serif text-2xl font-bold leading-[1.2]">
            Verify your email to join the directory
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base leading-[1.5]">
            We sent a verification link to {email}. Click it to confirm you own this address — this keeps Barterkin a real-community space and protects members from bots and duplicate accounts.
          </p>
          <p className="text-base leading-[1.5]">
            Until you verify, your profile won&apos;t appear in the directory and you can&apos;t contact other members.
          </p>

          <div className="pt-2">
            <ResendLinkButton email={email} />
          </div>

          <div className="text-sm pt-2">
            Signed in with the wrong address?{' '}
            <LogoutButton />{' '}
            <span className="text-muted-foreground">and try again.</span>
          </div>

          <p className="text-sm text-muted-foreground text-right pt-2">
            Still stuck?{' '}
            <a href="mailto:contact@barterkin.com" className="underline">
              Email contact@barterkin.com
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
```

Phase 2 MVP simplification: the ResendLinkButton (from 02-03a Task 3a.5) routes back to `/login?email=<prefill>` where the user re-runs Turnstile + submits. The LoginForm useEffect (from 02-03a Task 3a.4) reads the `?email=` query param and prefills the email field.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm build && grep -q "One more step" app/verify-pending/page.tsx && grep -q "Verify your email to join the directory" app/verify-pending/page.tsx && grep -q "this keeps Barterkin a real-community space" app/verify-pending/page.tsx && grep -q "mailto:contact@barterkin.com" app/verify-pending/page.tsx</automated>
  </verify>
  <done>
    - `app/verify-pending/page.tsx` exists
    - Contains literal "One more step" (H1)
    - Contains literal "Verify your email to join the directory" (H2)
    - Contains literal "this keeps Barterkin a real-community space"
    - Contains literal "Still stuck?" and `mailto:contact@barterkin.com`
    - `pnpm typecheck && pnpm build` pass
  </done>
</task>

<task id="2-3b-3" type="auto">
  <title>Task 3b.3: Three legal pages (ToS with GEO-04 clause, Privacy, Guidelines)</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (Legal Page Titles section, lines 197–221 — LOCKED copy)
    - `.planning/phases/02-authentication-legal/02-PATTERNS.md` (lines 271–292 — shared prose scaffold)
  </read_first>
  <action>
Create three legal pages. Each follows the same structural scaffold; differ only in copy per UI-SPEC.

**File 1: `app/legal/tos/page.tsx`** — **CRITICAL: contains GEO-04 locked clause**

```tsx
export const metadata = { title: 'Terms of Service — Barterkin' }

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-sage-bg text-forest-deep">
      <article className="mx-auto max-w-2xl py-16 px-6 space-y-8">
        <header className="space-y-2">
          <h1 className="font-serif text-3xl md:text-[32px] font-bold leading-[1.15]">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: 2026-04-19</p>
        </header>

        <p className="text-base leading-[1.5]">
          These terms govern your use of Barterkin, a community directory for Georgia residents to list skills offered and wanted, and to contact one another through a platform-relayed email. By creating an account you agree to these terms.
        </p>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">1. Who can use Barterkin</h2>
          <p className="text-base leading-[1.5]">
            You must be at least 18 years old and able to enter into a binding agreement under the laws of the State of Georgia. One account per person.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">2. Account responsibilities</h2>
          <p className="text-base leading-[1.5]">
            You are responsible for keeping your login credentials secure and for all activity on your account. Barterkin does not verify the skills you list — members barter at their own risk and judgment.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">3. Georgia residency (honor system)</h2>
          {/* GEO-04: LOCKED COPY — MUST appear verbatim. Do not edit without updating UI-SPEC. */}
          <p className="text-base leading-[1.5]">
            Barterkin is intended for people who live in Georgia, USA. We operate on an honor system — we don&apos;t verify your address. If you use Barterkin from outside Georgia, you do so at your own risk, you may not represent yourself as a Georgia resident, and we may remove any profile for which we have reason to believe this rule is being broken.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">4. Prohibited conduct</h2>
          <p className="text-base leading-[1.5]">
            Harassment, hate speech, fraud, scams, spam, impersonation, selling or soliciting cash-for-service, adult services, illegal goods, or any activity that violates Georgia or US law. Barterkin is for skill-for-skill barter — not a marketplace for goods or paid services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">5. Content ownership</h2>
          <p className="text-base leading-[1.5]">
            You retain ownership of the content you post (profile text, avatar, skills). By posting, you grant Barterkin a non-exclusive license to display your content within the directory to other members for the purpose of facilitating barter contact.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">6. Platform-relayed contact</h2>
          <p className="text-base leading-[1.5]">
            When you contact another member, Barterkin sends the email on your behalf with your email address as the reply-to. Once they reply, subsequent messages go directly between you and them, outside Barterkin. We do not read or store message content beyond what is needed to send and deliver it.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">7. Termination</h2>
          <p className="text-base leading-[1.5]">
            You may delete your account at any time by contacting us. We may suspend or terminate your account for violating these terms, particularly prohibited conduct (Section 4) or the residency rule (Section 3).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">8. Disclaimers</h2>
          <p className="text-base leading-[1.5]">
            Barterkin is provided &quot;as is.&quot; We do not verify skill claims, identity, or outcomes of barters. You interact with other members at your own risk.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">9. Limitation of liability</h2>
          <p className="text-base leading-[1.5]">
            To the maximum extent permitted by Georgia law, Barterkin is not liable for indirect, incidental, or consequential damages arising from your use of the platform.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">10. Changes to these terms</h2>
          <p className="text-base leading-[1.5]">
            We may update these terms. Material changes will be announced via email to the address on your account. Continued use after a change constitutes acceptance.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">11. Contact</h2>
          <p className="text-base leading-[1.5]">
            Questions about these terms? Email{' '}
            <a href="mailto:contact@barterkin.com" className="underline">contact@barterkin.com</a>.
          </p>
        </section>
      </article>
    </main>
  )
}
```

**File 2: `app/legal/privacy/page.tsx`**

```tsx
export const metadata = { title: 'Privacy Policy — Barterkin' }

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-sage-bg text-forest-deep">
      <article className="mx-auto max-w-2xl py-16 px-6 space-y-8">
        <header className="space-y-2">
          <h1 className="font-serif text-3xl md:text-[32px] font-bold leading-[1.15]">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: 2026-04-19</p>
        </header>

        <p className="text-base leading-[1.5]">
          This policy explains what personal information Barterkin collects, how we use it, and who we share it with. In short: we collect the minimum needed to run the directory, we never sell your data, and we never expose your email or phone on your public profile.
        </p>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">1. What we collect</h2>
          <p className="text-base leading-[1.5]">
            Email address (required for sign-in and contact relay), display name, county, skills offered/wanted, avatar image, optional bio, optional TikTok handle. We also receive technical data (IP address, device info) via Vercel and PostHog for security + analytics.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">2. How we use it</h2>
          <p className="text-base leading-[1.5]">
            To operate the directory, route contact-relay emails, prevent spam and abuse (via rate limits, bot challenges, bounce handling), and measure platform health.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">3. Who we share it with (Supabase, Resend, Vercel, PostHog, Cloudflare)</h2>
          <p className="text-base leading-[1.5]">
            We use Supabase (database + auth), Resend (transactional email), Vercel (hosting + analytics), PostHog (product analytics), and Cloudflare Turnstile (bot protection). We share only what each service needs. We do not sell your data.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">4. How long we keep it</h2>
          <p className="text-base leading-[1.5]">
            Account data: while your account is active. Signup IP counters: 7 days. Contact-request logs: 12 months. You may request deletion at any time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">5. Your rights (access, correction, deletion)</h2>
          <p className="text-base leading-[1.5]">
            Email contact@barterkin.com to access, correct, or delete your data. We will respond within 30 days.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">6. Cookies and analytics</h2>
          <p className="text-base leading-[1.5]">
            We use session cookies for sign-in and PostHog analytics cookies for product usage. No third-party advertising cookies.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">7. Security</h2>
          <p className="text-base leading-[1.5]">
            Transport is HTTPS-only. Passwords are not stored (we use magic-link + OAuth). Database access is controlled by Postgres row-level security.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">8. Children</h2>
          <p className="text-base leading-[1.5]">
            Barterkin is not directed to children under 18 and we do not knowingly collect data from minors.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">9. Changes to this policy</h2>
          <p className="text-base leading-[1.5]">
            We may update this policy. Material changes will be announced via email. Continued use constitutes acceptance.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">10. Contact</h2>
          <p className="text-base leading-[1.5]">
            Questions?{' '}
            <a href="mailto:contact@barterkin.com" className="underline">contact@barterkin.com</a>.
          </p>
        </section>
      </article>
    </main>
  )
}
```

**File 3: `app/legal/guidelines/page.tsx`**

```tsx
export const metadata = { title: 'Community Guidelines — Barterkin' }

export default function GuidelinesPage() {
  return (
    <main className="min-h-screen bg-sage-bg text-forest-deep">
      <article className="mx-auto max-w-2xl py-16 px-6 space-y-8">
        <header className="space-y-2">
          <h1 className="font-serif text-3xl md:text-[32px] font-bold leading-[1.15]">
            Community Guidelines
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: 2026-04-19</p>
        </header>

        <p className="text-base leading-[1.5]">
          Barterkin works because members treat each other like neighbors. These guidelines describe what we expect from every member, what behavior gets a profile removed, and how to report someone who&apos;s breaking the rules.
        </p>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">1. Be who you say you are</h2>
          <p className="text-base leading-[1.5]">
            Use your real name or a recognizable community handle. Don&apos;t impersonate others.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">2. Trade skills, not goods or cash</h2>
          <p className="text-base leading-[1.5]">
            Barterkin is for skill-for-skill exchange. Don&apos;t list goods, paid services, or cash offers.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">3. Respect boundaries</h2>
          <p className="text-base leading-[1.5]">
            If someone says no or doesn&apos;t reply, move on. Don&apos;t contact the same person repeatedly through other means.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">4. No harassment, hate speech, or scams</h2>
          <p className="text-base leading-[1.5]">
            Slurs, threats, sexual advances, and scams result in immediate account removal. Zero tolerance.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">5. Keep Barterkin for Georgia</h2>
          <p className="text-base leading-[1.5]">
            This is a Georgia-resident community. See the Terms of Service residency clause.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">6. Use the contact relay, not public contact info</h2>
          <p className="text-base leading-[1.5]">
            Don&apos;t post email addresses, phone numbers, or social handles for contact in your profile (TikTok is allowed for credibility only, not primary contact). Use the platform-relayed email so both sides are protected.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">7. Report problems (and how we respond)</h2>
          <p className="text-base leading-[1.5]">
            Use the Report button on any profile. Reports go to the admin address and are reviewed within 48 hours. We act on credible reports of prohibited conduct.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] mt-12">8. Consequences (warning → removal → ban)</h2>
          <p className="text-base leading-[1.5]">
            First minor violation: warning. Repeat or severe violation: profile removed. Scams, threats, or harassment: permanent ban with no appeal.
          </p>
        </section>
      </article>
    </main>
  )
}
```

All three pages use the same scaffold (max-w-2xl article, Lora H1/H2, Inter body, 12px gap between sections) per UI-SPEC. The GEO-04 clause in `tos/page.tsx` is LOCKED — Wave 3 E2E test `legal-pages.spec.ts` asserts the verbatim string match.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm build && grep -q "Barterkin is intended for people who live in Georgia, USA" app/legal/tos/page.tsx && grep -q "we never sell your data" app/legal/privacy/page.tsx && grep -q "Trade skills, not goods or cash" app/legal/guidelines/page.tsx</automated>
  </verify>
  <done>
    - All three files exist: `app/legal/tos/page.tsx`, `app/legal/privacy/page.tsx`, `app/legal/guidelines/page.tsx`
    - `app/legal/tos/page.tsx` contains verbatim string "Barterkin is intended for people who live in Georgia, USA" (GEO-04 locked clause)
    - `app/legal/tos/page.tsx` contains verbatim string "we may remove any profile for which we have reason to believe this rule is being broken"
    - `app/legal/privacy/page.tsx` contains "we never sell your data"
    - `app/legal/guidelines/page.tsx` contains "Trade skills, not goods or cash"
    - Each page has an H1 matching title ("Terms of Service", "Privacy Policy", "Community Guidelines")
    - Each page has at least 8 H2 sections
    - `pnpm typecheck && pnpm build` pass
  </done>
</task>

<task id="2-3b-4" type="auto">
  <title>Task 3b.4: components/layout/Footer.tsx + wire into app/layout.tsx</title>
  <read_first>
    - `.planning/phases/02-authentication-legal/02-UI-SPEC.md` (Footer Updates, lines 223–230 — three-column grid, copy)
    - `.planning/phases/02-authentication-legal/02-PATTERNS.md` (lines 408–438 — getClaims in server component)
    - `app/layout.tsx` (current root layout — extend, don't rewrite)
    - `lib/supabase/server.ts`
    - `components/auth/LogoutButton.tsx` (from 02-03a Task 3a.5)
  </read_first>
  <action>
**File 1: `components/layout/Footer.tsx`**

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'

/**
 * Site-wide footer. Spans every route.
 * Renders legal links always; auth state (Sign in vs. Log out + email) varies by claim.
 *
 * Uses getClaims() — NEVER getSession (banned per CLAUDE.md).
 */
export async function Footer() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const isAuthed = !!claims?.sub
  const email = (claims?.email as string | undefined) ?? ''

  return (
    <footer className="bg-forest text-sage-bg py-8 px-6 mt-16">
      <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-3 items-center">
        <div className="text-sm">
          © 2026 Barterkin · A Georgia community skills directory
        </div>
        <nav className="text-sm flex gap-4 md:justify-center flex-wrap">
          <Link href="/legal/tos" className="hover:underline hover:decoration-[var(--color-clay)]">
            Terms
          </Link>
          <span aria-hidden>·</span>
          <Link href="/legal/privacy" className="hover:underline hover:decoration-[var(--color-clay)]">
            Privacy
          </Link>
          <span aria-hidden>·</span>
          <Link href="/legal/guidelines" className="hover:underline hover:decoration-[var(--color-clay)]">
            Community Guidelines
          </Link>
        </nav>
        <div className="text-sm md:text-right space-y-1">
          {isAuthed ? (
            <>
              <div className="text-xs text-muted-foreground">Signed in as {email}</div>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="underline">Sign in</Link>
          )}
        </div>
      </div>
    </footer>
  )
}
```

**File 2: `app/layout.tsx` (EXTEND)**

Read current `app/layout.tsx`. Add Footer import at top with other imports. Render `<Footer />` as the last child inside the PostHogProvider (or whatever wraps `{children}`), but BEFORE the `<Analytics />` component. Do NOT touch font imports, metadata, or the globals.css import.

Diff-style change:
```tsx
// add near existing imports:
import { Footer } from '@/components/layout/Footer'

// inside the tree, right before <Analytics />:
<PostHogProvider>
  {children}
  <Footer />
</PostHogProvider>
<Analytics />
```

The exact structure depends on the current file — the executor must read it first and make the minimum change that (a) renders Footer after children, (b) keeps `<Analytics />` as the last child of `<body>`, (c) preserves the PostHogProvider wrapper.

**Verify after:** visit `/` in dev and confirm footer renders at bottom. Visit `/legal/tos`, `/login`, `/verify-pending` (if authed) — footer should appear on all of them (because it's in root layout, not a nested one).
  </action>
  <verify>
    <automated>pnpm build && grep -q "© 2026 Barterkin" components/layout/Footer.tsx && grep -q "getClaims()" components/layout/Footer.tsx && ! grep -q "getSession" components/layout/Footer.tsx && grep -q "<Footer" app/layout.tsx</automated>
  </verify>
  <done>
    - `components/layout/Footer.tsx` exists; exports `Footer` async server component
    - Footer contains "© 2026 Barterkin" literal
    - Footer renders `<Link href="/legal/tos">Terms</Link>` and Privacy and Community Guidelines links
    - Footer uses `supabase.auth.getClaims()` (grep); does NOT use `getSession` (grep must NOT match)
    - `app/layout.tsx` imports Footer and renders `<Footer />` (grep)
    - `app/layout.tsx` still renders `<Analytics />` (not accidentally removed)
    - `pnpm build` passes
    - Dev-time: visit `http://localhost:3000/` and see footer at bottom
  </done>
</task>

## Verification

After all four tasks complete:

```bash
# All page files exist
ls -la app/\(auth\)/{layout,login,signup}/*.tsx
ls -la app/verify-pending/page.tsx
ls -la app/legal/{tos,privacy,guidelines}/page.tsx
ls -la components/layout/Footer.tsx

# Key content verification (UI-SPEC-locked copy)
grep "Welcome to Barterkin" app/\(auth\)/login/page.tsx
grep "Welcome to Barterkin" app/\(auth\)/signup/page.tsx
grep "Sign in to find and offer skills" app/\(auth\)/login/page.tsx
grep "Create an account to join" app/\(auth\)/signup/page.tsx
grep "One more step" app/verify-pending/page.tsx
grep "Barterkin is intended for people who live in Georgia" app/legal/tos/page.tsx

# Footer wired
grep "<Footer" app/layout.tsx

# Banned patterns absent
! grep -r "getSession" app/\(auth\) app/verify-pending app/legal components/layout

# CI green
pnpm typecheck && pnpm lint && pnpm build
```

## Success Criteria

- [ ] `/login` and `/signup` render with GoogleAuthBlock, Separator, LoginForm, legal microcopy, cross-link
- [ ] `/verify-pending` renders "One more step" with resend link routing back to /login?email=prefill
- [ ] `/legal/tos` contains the GEO-04 locked clause verbatim
- [ ] `/legal/privacy` and `/legal/guidelines` render with UI-SPEC-locked H1s and sections
- [ ] Footer renders on every route, uses getClaims() (never getSession), shows LogoutButton for authed users
- [ ] `pnpm typecheck && pnpm lint && pnpm build` all pass

## Output

After completion, create `.planning/phases/02-authentication-legal/02-03b-SUMMARY.md` recording:
- List of all page and layout files
- Dev-time screenshot verification (ideally manual — note "footer verified on /, /login, /legal/tos")
- Flag if any UI-SPEC copy was adjusted (should be zero — all locked strings preserved)
