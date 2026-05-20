import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Check, X, Zap, Users, Crown, Sprout } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { captureEvent } from '@/lib/analytics'
import {
  BILLING_PLAN_AMOUNTS,
  formatUsdFromCents,
  getPremiumAnnualSavings,
  getFoundingMemberSavings,
  STRIPE_FOUNDING_MEMBER_LIMIT,
} from '@/lib/stripe/config'
import { FREE_LISTING_LIMIT } from '@/lib/listing-limits'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/fade-in'

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Barterkin plans: Free to get started, Premium for unlimited listings, or Founding Member for the best monthly rate.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Barterkin Pricing',
    description:
      'Free to get started. Premium for unlimited listings. Founding Member for the best monthly rate.',
    url: '/pricing',
    siteName: 'Barterkin',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Barterkin Pricing',
    description:
      'Free to get started. Premium for unlimited listings. Founding Member for the best monthly rate.',
  },
}

const FEATURES = [
  { label: 'Active listings', free: `Up to ${FREE_LISTING_LIMIT}`, premium: 'Unlimited', founding: 'Unlimited' },
  { label: 'Monthly contacts', free: '10', premium: '100', founding: '100' },
  { label: 'Featured placement', free: false, premium: true, founding: true },
  { label: 'Verified badge', free: false, premium: true, founding: true },
  { label: 'Listing boosts', free: false, premium: true, founding: true },
  { label: 'Community support', free: true, premium: true, founding: true },
] as const

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm font-medium text-forest-deep">{value}</span>
  }
  return value ? (
    <Check className="h-5 w-5 text-emerald-600" aria-label="Included" />
  ) : (
    <X className="h-5 w-5 text-muted-foreground/50" aria-label="Not included" />
  )
}

export default async function PricingPage() {
  const supabase = await createClient()

  const [{ count: memberCount }, { count: foundingCount }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { head: true, count: 'exact' })
      .eq('is_published', true)
      .eq('banned', false),
    supabase
      .from('profiles')
      .select('id', { head: true, count: 'exact' })
      .eq('tier', 'founding'),
  ])

  const totalMembers = memberCount ?? 0
  const foundingSlotsTaken = foundingCount ?? 0
  const foundingSlotsRemaining = Math.max(0, STRIPE_FOUNDING_MEMBER_LIMIT - foundingSlotsTaken)
  const foundingAvailable = foundingSlotsRemaining > 0

  const annualSavings = getPremiumAnnualSavings()
  const foundingSavings = getFoundingMemberSavings()

  const premiumMonthly = formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumMonthlyCents)
  const premiumAnnual = formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumAnnualCents)
  const foundingMonthly = formatUsdFromCents(BILLING_PLAN_AMOUNTS.foundingMonthlyCents)
  const annualSavingsLabel = formatUsdFromCents(annualSavings.totalSavingsCents)
  const annualMonthlyEquivalent = formatUsdFromCents(annualSavings.monthlyEquivalentCents)

  void captureEvent('system', 'pricing_page_viewed', {
    founding_slots_remaining: foundingSlotsRemaining,
    member_count: totalMembers,
  })

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-12 md:py-20">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <FadeIn>
          <p className="text-xs uppercase tracking-[0.18em] font-bold text-forest-mid">
            Simple, transparent pricing
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1 className="mt-4 font-serif text-3xl font-bold text-forest-deep sm:text-4xl md:text-5xl leading-[1.1]">
            Trade skills.{' '}
            <em className="not-italic text-clay">Not money.</em>
          </h1>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="mt-6 text-lg text-forest-mid leading-relaxed">
            Barterkin is free to use. Upgrade when you are ready for more
            listings, more contacts, and more visibility in your community.
          </p>
        </FadeIn>
      </section>

      {/* Plan cards */}
      <section className="mt-16 md:mt-24">
        <Stagger className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Free */}
          <StaggerItem>
            <Card className="h-full border-sage-light bg-sage-pale/50">
              <CardHeader className="pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest/10 text-forest">
                  <Sprout className="h-5 w-5" aria-hidden="true" />
                </div>
                <CardTitle className="mt-4 text-xl">Free</CardTitle>
                <CardDescription>Get started trading</CardDescription>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-forest-deep">$0</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="space-y-3 text-sm text-forest-mid">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    Up to {FREE_LISTING_LIMIT} active listings
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    10 contacts per month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    Browse directory & listings
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    Community support
                  </li>
                </ul>
                <div className="mt-auto pt-6">
                  <Link
                    href="/signup"
                    className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full')}
                    data-plan="free"
                  >
                    Get started free
                  </Link>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          {/* Premium Annual */}
          <StaggerItem>
            <Card className="h-full border-primary/20 bg-primary/5 ring-1 ring-primary/10">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Crown className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    Best value
                  </span>
                </div>
                <CardTitle className="mt-4 text-xl">Premium Annual</CardTitle>
                <CardDescription>Unlimited everything</CardDescription>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-forest-deep">{annualMonthlyEquivalent}</span>
                  <span className="text-sm text-muted-foreground">/mo billed yearly</span>
                </div>
                <p className="text-xs text-emerald-700 font-medium">
                  Save {annualSavingsLabel}/year vs monthly
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="space-y-3 text-sm text-forest-mid">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    Unlimited active listings
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    100 contacts per month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    Featured placement
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    Verified badge
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    Listing boosts with credits
                  </li>
                </ul>
                <div className="mt-auto pt-6">
                  <Link
                    href="/signup?plan=premium-annual"
                    className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
                    data-plan="premium-annual"
                  >
                    Choose Annual — {premiumAnnual}/yr
                  </Link>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          {/* Founding Member */}
          <StaggerItem>
            <Card
              className={cn(
                'h-full',
                foundingAvailable
                  ? 'border-amber-300/60 bg-amber-50/60'
                  : 'border-sage-light bg-sage-pale/30 opacity-70',
              )}
            >
              <CardHeader className="pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Zap className="h-5 w-5" aria-hidden="true" />
                </div>
                <CardTitle className="mt-4 text-xl">Founding Member</CardTitle>
                <CardDescription>Lock in the lowest rate</CardDescription>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-forest-deep">{foundingMonthly}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                {foundingAvailable ? (
                  <p className="text-xs text-amber-700 font-medium">
                    {foundingSlotsRemaining} of {STRIPE_FOUNDING_MEMBER_LIMIT} slots left
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground font-medium">
                    Currently sold out
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="space-y-3 text-sm text-forest-mid">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    Everything in Premium
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    Lowest monthly rate forever
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    Founding member badge
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    Early access to new features
                  </li>
                </ul>
                <div className="mt-auto pt-6">
                  {foundingAvailable ? (
                    <Link
                      href="/signup?plan=founding"
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'lg' }),
                        'w-full border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
                      )}
                      data-plan="founding"
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Claim Founding — {foundingMonthly}/mo
                    </Link>
                  ) : (
                    <Button variant="outline" size="lg" className="w-full" disabled>
                      Sold out
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        </Stagger>
      </section>

      {/* Feature comparison */}
      <section className="mt-16 md:mt-24">
        <FadeIn>
          <h2 className="text-center font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
            Compare plans
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="mt-8 overflow-hidden rounded-2xl border border-sage-light bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-sage-light bg-sage-pale/50">
                    <th className="px-6 py-4 text-sm font-semibold text-forest-deep">Feature</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-forest-deep">Free</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-primary">Premium</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-amber-700">Founding</th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((feature, i) => (
                    <tr
                      key={feature.label}
                      className={cn(
                        'border-b border-sage-light/50',
                        i === FEATURES.length - 1 && 'border-b-0',
                      )}
                    >
                      <td className="px-6 py-4 text-sm text-forest-mid">{feature.label}</td>
                      <td className="px-6 py-4 text-center">
                        <FeatureCell value={feature.free} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <FeatureCell value={feature.premium} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <FeatureCell value={feature.founding} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Social proof */}
      <section className="mt-16 md:mt-24">
        <FadeIn>
          <div className="mx-auto max-w-2xl rounded-2xl bg-sage-pale p-10 text-center ring-1 ring-sage-light md:p-14">
            <div className="flex items-center justify-center gap-2 text-forest-mid">
              <Users className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-medium">
                {totalMembers.toLocaleString()} members already trading
              </span>
            </div>
            <h2 className="mt-4 font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
              Ready to join your neighbors?
            </h2>
            <p className="mt-4 text-base text-forest-mid leading-relaxed">
              Start free and upgrade when you need more. No credit card required
              to browse, list, and trade.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'h-12 min-w-[180px] bg-clay hover:bg-clay/90 text-sage-bg font-semibold',
                )}
                data-plan="free"
              >
                Get started free
              </Link>
              <Link
                href="/directory"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'h-12 min-w-[180px]',
                )}
              >
                Browse the directory
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* FAQ */}
      <section className="mt-16 md:mt-24">
        <FadeIn>
          <h2 className="text-center font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
            Frequently asked questions
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="mx-auto mt-8 max-w-3xl space-y-4">
            {[
              {
                q: 'Can I really use Barterkin for free?',
                a: 'Yes. The free plan includes up to 3 active listings and 10 contacts per month. You can browse, list, and trade without ever paying.',
              },
              {
                q: 'What happens if I hit my free plan limits?',
                a: 'You will see a friendly nudge to upgrade. Your existing listings stay visible, but you will need Premium to add more listings or send more contacts.',
              },
              {
                q: 'Can I switch from monthly to annual later?',
                a: 'Absolutely. Monthly Premium members can switch to annual anytime through the billing portal and start saving immediately.',
              },
              {
                q: 'What is a Founding Member?',
                a: 'Founding Members lock in our lowest rate forever — $5/month — and get a special badge. Only 100 slots exist, and once they are gone, they are gone.',
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Yes. You can cancel or change your plan from the billing portal at any time. No contracts, no hassle.',
              },
            ].map(({ q, a }) => (
              <div
                key={q}
                className="rounded-xl border border-sage-light bg-card p-6"
              >
                <h3 className="font-semibold text-forest-deep">{q}</h3>
                <p className="mt-2 text-sm text-forest-mid leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>
    </main>
  )
}
