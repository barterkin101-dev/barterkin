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
