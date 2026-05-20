'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { LoaderCircle, Gift, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  BILLING_PLAN_AMOUNTS,
  formatUsdFromCents,
  getPremiumAnnualSavings,
} from '@/lib/stripe/config'

type GiftInterval = 'annual' | 'monthly'

export function GiftPurchaseForm() {
  const [recipientEmail, setRecipientEmail] = useState('')
  const [interval, setInterval] = useState<GiftInterval>('annual')
  const [isPending, setIsPending] = useState(false)
  const [sent, setSent] = useState(false)

  const annualSavings = getPremiumAnnualSavings()
  const premiumMonthlyLabel = `${formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumMonthlyCents)}/month`
  const premiumAnnualLabel = `${formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumAnnualCents)}/year`
  const annualSavingsLabel = formatUsdFromCents(annualSavings.totalSavingsCents)

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault()
    const email = recipientEmail.trim()
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address.')
      return
    }

    setIsPending(true)
    try {
      const res = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          priceId: interval === 'annual' ? 'annual' : 'premium',
          gift: true,
          recipientEmail: email,
        }),
      })

      const payload = await res.json().catch(() => null) as
        | { ok?: boolean; error?: string; url?: string }
        | null

      if (!res.ok || !payload?.ok || !payload.url) {
        throw new Error(payload?.error ?? 'Unable to start gift purchase.')
      }

      window.location.assign(payload.url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to start gift purchase.')
      setIsPending(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 size-8 text-emerald-600" />
        <p className="font-medium text-emerald-900">Gift purchase initiated!</p>
        <p className="mt-1 text-sm text-emerald-800/80">
          Complete checkout on Stripe. The recipient will receive an email with their redemption link.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handlePurchase} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="gift-recipient-email">Recipient email</Label>
        <Input
          id="gift-recipient-email"
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          placeholder="friend@example.com"
          disabled={isPending}
          required
        />
        <p className="text-xs text-muted-foreground">
          The recipient will receive an email with instructions to redeem their Premium access.
        </p>
      </div>

      <div className="rounded-xl border border-primary/15 bg-primary/5 p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            className={cn(
              'rounded-lg px-4 py-3 text-left transition',
              interval === 'annual'
                ? 'bg-background shadow-sm ring-1 ring-primary/15'
                : 'text-muted-foreground hover:bg-background/70',
            )}
            onClick={() => setInterval('annual')}
            disabled={isPending}
          >
            <span className="block text-sm font-semibold text-foreground">Annual</span>
            <span className="block text-xs text-muted-foreground">{premiumAnnualLabel}</span>
            <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
              Save {annualSavingsLabel}
            </span>
          </button>
          <button
            type="button"
            className={cn(
              'rounded-lg px-4 py-3 text-left transition',
              interval === 'monthly'
                ? 'bg-background shadow-sm ring-1 ring-primary/15'
                : 'text-muted-foreground hover:bg-background/70',
            )}
            onClick={() => setInterval('monthly')}
            disabled={isPending}
          >
            <span className="block text-sm font-semibold text-foreground">Monthly</span>
            <span className="block text-xs text-muted-foreground">{premiumMonthlyLabel}</span>
            <span className="mt-1 inline-flex px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Flexible billing
            </span>
          </button>
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Gift className="mr-2 size-4" />}
        Gift {interval === 'annual' ? 'Premium Annual' : 'Premium Monthly'} —{' '}
        {interval === 'annual'
          ? formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumAnnualCents)
          : formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumMonthlyCents)}
        {interval === 'annual' ? '/year' : '/mo'}
      </Button>
    </form>
  )
}
