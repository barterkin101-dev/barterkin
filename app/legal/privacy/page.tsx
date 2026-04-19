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
