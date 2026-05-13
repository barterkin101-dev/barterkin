import { redirect } from 'next/navigation'
import { CheckCircle2, CreditCard, ShieldCheck, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { BillingActions } from '@/components/dashboard/BillingActions'

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
          Upgrade to premium to remove listing caps and unlock paid member benefits as Stripe billing rolls out.
        </p>
      </header>

      <Alert>
        <CreditCard className="h-4 w-4" />
        <AlertTitle>{isPaid ? 'Your subscription is active.' : 'You are on the free plan.'}</AlertTitle>
        <AlertDescription>
          {isPaid
            ? `Your current tier is ${tier}. ${periodEnd ? `Current access is synced through ${periodEnd}.` : 'Stripe will keep your access in sync.'}`
            : 'Free members can keep using Barterkin, but premium is the path to unlimited listings once billing is fully enabled.'}
        </AlertDescription>
      </Alert>

      <section className="grid gap-4 lg:grid-cols-[1.25fr,0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Plan comparison</CardTitle>
            <CardDescription>
              Stripe checkout is wired for premium now. Founding member pricing is queued next.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Free</h2>
                  <p className="text-sm text-muted-foreground">Default member tier</p>
                </div>
                <Badge variant="outline">Current for new members</Badge>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                  Up to 3 active listings while premium gating lands
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                  Core messaging and profile features
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                  Referral credits still apply
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Premium</h2>
                  <p className="text-sm text-muted-foreground">$9/month</p>
                </div>
                <Badge>Revenue v1</Badge>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 size-4 text-primary" />
                  Unlimited listings once gate enforcement is enabled
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 size-4 text-primary" />
                  Stripe-managed billing and subscription lifecycle
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-4 text-primary" />
                  Ready for future paid-member perks
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Start checkout now, or manage your existing subscription in Stripe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BillingActions canManageBilling={canManageBilling} />
            {!canManageBilling ? (
              <p className="text-sm text-muted-foreground">
                The billing portal unlocks after your first successful checkout.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
