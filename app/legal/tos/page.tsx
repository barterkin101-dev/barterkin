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
