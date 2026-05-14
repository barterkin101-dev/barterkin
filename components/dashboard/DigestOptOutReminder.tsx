'use client'

import { useActionState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Mail, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { enableWeeklyDigestFromDashboard } from '@/lib/actions/profile'
import { captureClientEvent } from '@/lib/analytics-client'
import { cn } from '@/lib/utils'

export function DigestOptOutReminder({ href }: { href: string }) {
  const [state, formAction, pending] = useActionState(enableWeeklyDigestFromDashboard, null)
  const trackedRef = useRef(false)

  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true

    captureClientEvent('digest_opt_out_reminder_impression', {
      source: 'dashboard',
    })
  }, [])

  function handleEnableClick() {
    captureClientEvent('digest_opt_out_reminder_clicked', {
      source: 'dashboard',
    })
  }

  return (
    <Card className="border-amber-200 bg-amber-50/80">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-amber-900">
            {state?.ok ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            ) : (
              <Mail className="h-5 w-5 text-amber-700" />
            )}
            <h2 className="font-semibold">
              {state?.ok ? 'Weekly digest is back on' : 'Weekly digest is turned off'}
            </h2>
          </div>
          <p className="max-w-2xl text-sm text-amber-900/80">
            {state?.ok
              ? "You'll get the next roundup of fresh county listings and trade opportunities by email."
              : 'Turn it back on in one click to get new county listings, active trade opportunities, and a weekly shortcut back into the marketplace.'}
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-medium text-amber-950/80">
            <span className="rounded-full bg-white/80 px-3 py-1">Fresh local listings</span>
            <span className="rounded-full bg-white/80 px-3 py-1">Trade opportunities</span>
            <span className="rounded-full bg-white/80 px-3 py-1">Weekly shortlist by email</span>
          </div>
          {state?.error && !state.ok ? (
            <p role="alert" className="text-sm text-destructive">{state.error}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <form action={formAction}>
            <Button
              type="submit"
              size="lg"
              disabled={pending || state?.ok}
              className="bg-amber-700 text-white hover:bg-amber-800"
              onClick={handleEnableClick}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {state?.ok ? 'Digest enabled' : 'Turn digest back on'}
            </Button>
          </form>
          <Link
            href={href}
            className={cn(
              buttonVariants({ variant: 'link' }),
              'h-auto px-0 text-amber-900',
            )}
          >
            Manage email settings
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
