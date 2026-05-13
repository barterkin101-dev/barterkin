'use client'

import { useActionState, useState } from 'react'
import { CheckCircle, Loader2, Mail } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type LandingHeroVariant } from '@/lib/ab-testing-shared'
import georgiaCounties from '@/lib/data/georgia-counties.json'
import { joinWaitlist, type JoinWaitlistResult } from '@/lib/actions/waitlist'

export function WaitlistForm({ heroVariant }: { heroVariant: LandingHeroVariant }) {
  const [state, formAction, isPending] = useActionState<JoinWaitlistResult | null, FormData>(
    joinWaitlist,
    null,
  )

  const [email, setEmail] = useState('')

  if (state?.ok) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-sage-bg/10 px-4 py-3 text-sage-bg">
        <CheckCircle className="h-5 w-5 shrink-0 text-clay" aria-hidden="true" />
        <p className="text-sm">
          {state.alreadyJoined
            ? "You're already on the list — we'll be in touch soon."
            : state.confirmationSent
              ? "You're on the waitlist! Check your inbox for a confirmation."
              : "You're on the waitlist! We'll be in touch soon."}
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="landingHeroVariant" value={heroVariant} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Mail
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sage-bg/50"
            aria-hidden="true"
          />
          <Input
            name="email"
            type="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 border-sage-bg/20 bg-sage-bg/10 pl-10 text-sage-bg placeholder:text-sage-bg/40 focus-visible:border-clay focus-visible:ring-clay/30"
            aria-label="Email address"
            autoComplete="email"
          />
        </div>
        <Button
          type="submit"
          disabled={isPending}
          className="h-12 min-w-[160px] bg-clay hover:bg-clay/90 text-sage-bg font-semibold disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Joining...
            </>
          ) : (
            'Join the waitlist'
          )}
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="waitlist-county" className="text-xs font-medium text-sage-bg/70">
          County helps us open spots in the right places first.
        </label>
        <select
          id="waitlist-county"
          name="countyId"
          defaultValue=""
          className="h-12 rounded-md border border-sage-bg/20 bg-sage-bg/10 px-3 text-sm text-sage-bg focus:border-clay focus:outline-none"
          aria-label="Georgia county"
        >
          <option value="">Georgia county (optional)</option>
          {georgiaCounties.map((county) => (
            <option key={county.fips} value={county.fips}>
              {county.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-sage-bg/50">
          Optional, but it helps us prioritize launches county by county.
        </p>
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-red-200">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}
