import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, CreditCard, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { BillingActions } from '@/components/dashboard/BillingActions'
import { FREE_LISTING_LIMIT } from '@/lib/listing-limits'
import {
  BILLING_PLAN_AMOUNTS,
  formatUsdFromCents,
  getFoundingMemberSavings,
  getPremiumAnnualSavings,
  STRIPE_FOUNDING_MEMBER_LIMIT,
} from '@/lib/stripe/config'

function formatPeriodEnd(value: string | null): string | null {
  if (!value) return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tier, stripe_customer_id, subscription_current_period_end')
    .eq('owner_id', user.id)
    .maybeSingle()

  const tier = profile?.tier ?? 'free'
  const isPaid = tier === 'premium' || tier === 'founding'
  const periodEnd = formatPeriodEnd(profile?.subscription_current_period_end ?? null)
  const canManageBilling = Boolean(profile?.stripe_customer_id)
  const annualSavings = getPremiumAnnualSavings()
  const foundingSavings = getFoundingMemberSavings()
  const premiumMonthlyLabel = `${formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumMonthlyCents)}/month`
  const premiumAnnualLabel = `${formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumAnnualCents)}/year`
  const foundingMonthlyLabel = `${formatUsdFromCents(BILLING_PLAN_AMOUNTS.foundingMonthlyCents)}/month`
  const annualEquivalentLabel = `${formatUsdFromCents(annualSavings.monthlyEquivalentCents)}/month`
  const annualSavingsLabel = formatUsdFromCents(annualSavings.totalSavingsCents)
  const foundingAnnualizedLabel = formatUsdFromCents(foundingSavings.annualizedCents)
  const foundingAnnualSavingsLabel = formatUsdFromCents(foundingSavings.versusPremiumAnnualCents)
  const foundingMonthlySavingsLabel = formatUsdFromCents(foundingSavings.versusPremiumMonthlyCents)

  // Count how many founding member slots are taken
  const { count: foundingCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('tier', 'founding')

  const foundingSlotsRemaining = Math.max(0, STRIPE_FOUNDING_MEMBER_LIMIT - (foundingCount ?? 0))
  const foundingAvailable = foundingSlotsRemaining > 0 && tier === 'free'

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">
            Billing
          </h1>
          <Badge variant={isPaid ? 'default' : 'secondary'}>
            {tier === 'founding' ? 'Founding Member' : isPaid ? 'Premium' : 'Free'}
          </Badge>
        </div>
        <p className="max-w-3xl text-base text-muted-foreground">
          Upgrade to Premium to remove listing caps and unlock paid member benefits. Annual billing saves two months compared with paying monthly.
        </p>
      </header>

      <Alert>
        <CreditCard className="h-4 w-4" />
        <AlertTitle>{isPaid ? 'Your subscription is active.' : 'You are on the free plan.'}</AlertTitle>
        <AlertDescription>
          {isPaid
            ? `Your current tier is ${tier}. ${periodEnd ? `Current access is synced through ${periodEnd}.` : 'Stripe will keep your access in sync.'}`
            : 'Free members can keep using Barterkin, but premium unlocks unlimited listings and paid-member perks.'}
        </AlertDescription>
      </Alert>

      {!isPaid && foundingAvailable ? (
        <Card className="border-amber-300 bg-amber-50/80">
          <CardHeader className="space-y-2">
            <Badge className="w-fit bg-amber-600">Founding window</Badge>
            <CardTitle className="text-xl text-amber-950">Founding pricing closes when these slots are gone.</CardTitle>
            <CardDescription className="max-w-3xl text-amber-900/80">
              Lock in Founding Member at {foundingMonthlyLabel} for an annualized {foundingAnnualizedLabel}, saving {foundingAnnualSavingsLabel} versus Premium Annual and {foundingMonthlySavingsLabel} versus Premium Monthly.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 border-t border-amber-200/80 pt-5 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {foundingSlotsRemaining} of {STRIPE_FOUNDING_MEMBER_LIMIT} founding slots are still available for free members upgrading today.
            </p>
            <Link
              href="#founding-checkout"
              className="inline-flex items-center justify-center rounded-md bg-amber-600 px-4 py-2 font-medium text-white transition hover:bg-amber-700"
            >
              Claim founding pricing
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.25fr,0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Plan comparison</CardTitle>
            <CardDescription>
              Choose monthly, annual, or founding access. Annual Premium is the best value, and founding member slots are limited.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* Free */}
            <div className="rounded-xl border bg-muted/20 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Free</h2>
                  <p className="text-sm text-muted-foreground">{formatUsdFromCents(0)}/month</p>
                </div>
                {tier === 'free' ? <Badge variant="outline">Current</Badge> : null}
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                  Up to {FREE_LISTING_LIMIT} active listings
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                  Core messaging and profile features
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                  Referral credits
                </li>
              </ul>
            </div>

            {/* Premium */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Premium Monthly</h2>
                  <p className="text-sm text-muted-foreground">{premiumMonthlyLabel}</p>
                </div>
                {tier === 'premium' ? <Badge>Current</Badge> : <Badge variant="outline">Flexible</Badge>}
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 size-4 text-primary" />
                  Unlimited listings
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 size-4 text-primary" />
                  Featured placement in directory
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-4 text-primary" />
                  Premium badge on profile
                </li>
              </ul>
            </div>

            {/* Premium Annual */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Premium Annual</h2>
                  <p className="text-sm text-muted-foreground">{premiumAnnualLabel}</p>
                </div>
                <Badge className="bg-emerald-600">Best value</Badge>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 size-4 text-emerald-600" />
                  Everything in Premium Monthly
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 size-4 text-emerald-600" />
                  Save {annualSavingsLabel} per year
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-4 text-emerald-600" />
                  Works out to {annualEquivalentLabel} billed yearly
                </li>
              </ul>
            </div>

            {/* Founding Member */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Founding Member</h2>
                  <p className="text-sm text-muted-foreground">{foundingMonthlyLabel}</p>
                </div>
                {tier === 'founding' ? (
                  <Badge className="bg-amber-600">Current</Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    {foundingSlotsRemaining} left
                  </Badge>
                )}
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Zap className="mt-0.5 size-4 text-amber-600" />
                  Everything in Premium
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="mt-0.5 size-4 text-amber-600" />
                  Lifetime discount (locked-in price)
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="mt-0.5 size-4 text-amber-600" />
                  Founding Member badge
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              {isPaid
                ? 'Manage your subscription or change plans.'
                : foundingAvailable
                  ? `Choose annual Premium at ${annualEquivalentLabel} billed yearly, switch to monthly if you prefer, or claim a Founding Member slot.`
                  : `Choose annual Premium at ${annualEquivalentLabel} billed yearly or switch to monthly — founding slots are sold out.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isPaid ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-950">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">
                    Compare the monthly cost before you check out.
                  </p>
                  <p className="text-sm text-slate-700">
                    Annual Premium saves {annualSavingsLabel} per year, while Founding keeps the lowest monthly rate if slots are still open.
                  </p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Founding</p>
                    <p className="mt-2 text-lg font-semibold">{foundingMonthlyLabel}</p>
                    <p className="mt-1 text-xs text-amber-800/80">
                      {foundingAvailable
                        ? `${foundingSlotsRemaining} of ${STRIPE_FOUNDING_MEMBER_LIMIT} slots left today`
                        : 'Currently sold out'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-background p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Premium monthly</p>
                    <p className="mt-2 text-lg font-semibold">{premiumMonthlyLabel}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Flexible billing, highest monthly spend
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Premium annual</p>
                    <p className="mt-2 text-lg font-semibold">{annualEquivalentLabel}</p>
                    <p className="mt-1 text-xs text-emerald-800/80">
                      {premiumAnnualLabel} billed yearly, saves {annualSavingsLabel}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            <BillingActions
              canManageBilling={canManageBilling}
              tier={tier}
              foundingAvailable={foundingAvailable}
            />
            {!canManageBilling ? (
              <p className="text-sm text-muted-foreground">
                {isPaid
                  ? 'The billing portal unlocks after your first successful checkout.'
                  : `The billing portal unlocks after your first successful checkout. Annual Premium bills ${premiumAnnualLabel} upfront and saves ${annualSavingsLabel} versus monthly.`}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
