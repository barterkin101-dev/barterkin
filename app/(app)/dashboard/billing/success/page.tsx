import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Sparkles, ArrowRight, ListPlus, UserCircle, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { captureEventFireAndForget } from '@/lib/analytics'

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tier, display_name')
    .eq('owner_id', user.id)
    .maybeSingle()

  const tier = profile?.tier ?? 'free'
  const isPaid = tier === 'premium' || tier === 'founding'
  const displayName = profile?.display_name ?? 'there'

  // If someone lands here but isn't paid yet (webhook lag), show a "processing" state
  // instead of redirecting so they don't get confused.
  const { tier: queryTier } = await searchParams
  const expectedTier = queryTier === 'founding' ? 'founding' : 'premium'
  const expectedTierLabel = expectedTier === 'founding' ? 'Founding Member' : 'Premium'
  const activeTierLabel = tier === 'founding' ? 'Founding Member' : 'Premium'

  if (profile?.id) {
    void captureEventFireAndForget(profile.id, 'billing_success_viewed', {
      expected_tier: expectedTier,
      actual_tier: tier,
      status: isPaid ? 'active' : 'processing',
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">
          {isPaid ? `Welcome to ${activeTierLabel}!` : `${expectedTierLabel} payment received`}
        </h1>
        <p className="mx-auto max-w-md text-base text-muted-foreground">
          {isPaid
            ? `Hey ${displayName}, your ${activeTierLabel} subscription is active. Here's what to do next.`
            : `Hey ${displayName}, we received your payment for ${expectedTierLabel}. It may take a moment for your account to update — refresh this page in a few seconds.`}
        </p>
        {!isPaid && (
          <Badge variant="outline" className="mx-auto">
            Activating {expectedTierLabel}...
          </Badge>
        )}
      </div>

      {isPaid && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Your next steps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Link
                href="/dashboard/listings/new"
                className="group flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted/50"
              >
                <ListPlus className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Create a listing</span>
                <span className="text-xs text-muted-foreground">
                  Unlimited listings unlocked
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>

              <Link
                href="/dashboard/profile/edit"
                className="group flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted/50"
              >
                <UserCircle className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Polish your profile</span>
                <span className="text-xs text-muted-foreground">
                  Add a bio and skills
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>

              <Link
                href="/directory"
                className="group flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted/50"
              >
                <MessageSquare className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Browse the directory</span>
                <span className="text-xs text-muted-foreground">
                  Find people to trade with
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Pro tip:</strong> Premium members get featured placement in the directory.
                The more complete your profile, the higher you rank.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard/billing">Back to billing</Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
