import type { Metadata } from 'next'
import Link from 'next/link'
import { Sprout, MapPin, Heart, HandCoins, Users, ShieldCheck } from 'lucide-react'

import { FadeIn, Stagger, StaggerItem } from '@/components/ui/fade-in'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Barterkin is a community skills exchange for Georgia. Learn why we built it, what we believe, and how to join.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Barterkin',
    description:
      'Barterkin is a community skills exchange for Georgia. Learn why we built it, what we believe, and how to join.',
    url: '/about',
    siteName: 'Barterkin',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Barterkin',
    description:
      'Barterkin is a community skills exchange for Georgia. Learn why we built it, what we believe, and how to join.',
  },
}

const VALUES = [
  {
    icon: MapPin,
    title: 'Georgia only',
    body: 'We do not scale to every city on earth. We focus on the counties we know, so the directory stays local, relevant, and accountable.',
  },
  {
    icon: HandCoins,
    title: 'No fees, ever',
    body: 'Barterkin is free to use. There are no subscriptions, no commissions, and no "premium tiers." The only currency here is your time and talent.',
  },
  {
    icon: Heart,
    title: 'Community first',
    body: 'We are not a gig platform. We are a neighbor-to-neighbor directory. Reputation is earned through real trades, not star ratings.',
  },
  {
    icon: ShieldCheck,
    title: 'Human scale',
    body: 'Every profile is reviewed. Messages go to real email inboxes. We keep the tech simple so the humans stay in charge.',
  },
]

export default function AboutPage() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-6 py-12 md:py-20">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <FadeIn>
          <p className="text-xs uppercase tracking-[0.18em] font-bold text-forest-mid">
            About Barterkin
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1 className="mt-4 font-serif text-3xl font-bold text-forest-deep sm:text-4xl md:text-5xl leading-[1.1]">
            Built by Georgians,{' '}
            <em className="not-italic text-clay">for Georgians.</em>
          </h1>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="mt-6 text-lg text-forest-mid leading-relaxed">
            Barterkin is a community skills directory where neighbors trade what
            they make for what they need. No money changes hands. No apps to
            download. Just real people, real skills, and real trust.
          </p>
        </FadeIn>
      </section>

      {/* Origin story */}
      <section className="mt-20 md:mt-28">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
          <FadeIn variant="slideInLeft">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sage-light">
              <div className="absolute inset-0 flex items-center justify-center">
                <Sprout className="h-24 w-24 text-forest/20" aria-hidden="true" />
              </div>
              {/* Decorative gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-forest-deep/10 to-transparent" />
            </div>
          </FadeIn>

          <div>
            <FadeIn delay={0.1}>
              <p className="text-xs uppercase tracking-[0.18em] font-bold text-forest-mid">
                Why we exist
              </p>
              <h2 className="mt-3 font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
                The internet forgot your neighbor
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-base text-forest-mid leading-relaxed">
                Georgia is full of makers. Bakers in Carrollton. Plumbers in
                Dallas. Beekeepers in South Fulton. Braiders in Douglasville.
                But until now, there was no single place to find them — and no
                easy way to offer your own skills in return.
              </p>
            </FadeIn>
            <FadeIn delay={0.3}>
              <p className="mt-4 text-base text-forest-mid leading-relaxed">
                Marketplaces today are built for speed and scale. They squeeze
                every transaction for a fee and treat human connection as
                friction. We think the opposite: the best trades happen slowly,
                locally, and face-to-face.
              </p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mt-20 md:mt-28">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <FadeIn>
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-forest-mid">
              What we believe
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="mt-3 font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
              Principles over profit
            </h2>
          </FadeIn>
        </div>

        <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <StaggerItem key={title}>
              <div className="rounded-2xl bg-sage-pale p-8 ring-1 ring-sage-light hover:ring-forest/10 transition-all duration-300">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest/10 text-forest">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-serif text-lg font-bold text-forest-deep">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-forest-mid leading-relaxed">
                  {body}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* How we're different */}
      <section className="mt-20 md:mt-28">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
          <div className="order-2 md:order-1">
            <FadeIn delay={0.1}>
              <p className="text-xs uppercase tracking-[0.18em] font-bold text-forest-mid">
                How it works
              </p>
              <h2 className="mt-3 font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
                Simple, slow, and sincere
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-base text-forest-mid leading-relaxed">
                You list what you offer and what you need. Someone nearby finds
                you and sends a message. We forward it to your email. The rest
                happens between the two of you — scheduling, bartering,
                swapping. We do not handle payments, disputes, or reviews.
              </p>
            </FadeIn>
            <FadeIn delay={0.3}>
              <p className="mt-4 text-base text-forest-mid leading-relaxed">
                That lack of oversight is intentional. We are building a
                directory, not a marketplace. The trust is yours to build. The
                community is yours to shape.
              </p>
            </FadeIn>
          </div>

          <FadeIn variant="slideInRight" className="order-1 md:order-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sage-light">
              <div className="absolute inset-0 flex items-center justify-center">
                <Users className="h-24 w-24 text-forest/20" aria-hidden="true" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-bl from-forest-deep/10 to-transparent" />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Meet the team */}
      <section className="mt-20 md:mt-28">
        <FadeIn>
          <div className="mx-auto max-w-2xl rounded-2xl bg-sage-pale p-10 text-center ring-1 ring-sage-light md:p-14">
            <h2 className="font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
              Meet the faces behind the movement
            </h2>
            <p className="mt-4 text-base text-forest-mid leading-relaxed">
              Barterkin was started by a small group of Georgians who believe
              community is the best currency. Read their stories and see what
              inspired the directory.
            </p>
            <Link
              href="/behind-barterkin"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-8 inline-flex h-12 min-w-[180px] items-center justify-center bg-clay hover:bg-clay/90 text-sage-bg font-semibold",
              )}
            >
              Behind Barterkin
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* CTA */}
      <section className="mt-20 md:mt-28">
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl bg-forest-deep px-8 py-16 text-center md:px-16 md:py-20">
            {/* subtle grain */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              }}
            />
            <div className="relative z-10">
              <h2 className="font-serif text-2xl font-bold text-sage-bg sm:text-3xl">
                Join your neighbors
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base text-sage-bg/75 leading-relaxed">
                Whether you sew, solder, bake, or braid — there is someone near
                you who needs exactly what you make. List your skills today and
                see who shows up.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'h-12 min-w-[180px] bg-clay hover:bg-clay/90 text-sage-bg font-semibold',
                  )}
                >
                  <Sprout className="mr-2 h-4 w-4" aria-hidden="true" />
                  Create your profile
                </Link>
                <Link
                  href="/directory"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    'h-12 min-w-[180px] border-sage-bg/30 text-sage-bg bg-transparent hover:bg-sage-bg/10',
                  )}
                >
                  Browse the directory
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </main>
  )
}
