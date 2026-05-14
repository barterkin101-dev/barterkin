import Link from 'next/link'
import { Zap, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { STRIPE_FOUNDING_MEMBER_LIMIT } from '@/lib/stripe/config'

interface FoundingMemberNudgeProps {
  slotsRemaining: number
  foundingMonthlyCents: number
  premiumMonthlyCents: number
  premiumAnnualCents: number
}

export function FoundingMemberNudge({
  slotsRemaining,
  foundingMonthlyCents,
  premiumMonthlyCents,
  premiumAnnualCents,
}: FoundingMemberNudgeProps) {
  const slotsTaken = STRIPE_FOUNDING_MEMBER_LIMIT - slotsRemaining
  const percentFilled = Math.round((slotsTaken / STRIPE_FOUNDING_MEMBER_LIMIT) * 100)
  const isUrgent = slotsRemaining <= 10

  const foundingAnnualized = foundingMonthlyCents * 12
  const versusPremiumMonthly = (premiumMonthlyCents * 12) - foundingAnnualized
  const versusPremiumAnnual = premiumAnnualCents - foundingAnnualized

  const fmt = (cents: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100)

  return (
    <Card className={cn(
      'border-amber-200',
      isUrgent ? 'bg-amber-50' : 'bg-amber-50/50'
    )}>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className={cn('h-5 w-5', isUrgent ? 'text-amber-600' : 'text-amber-500')} />
              <h3 className="font-semibold text-amber-900">
                {isUrgent ? 'Almost gone — ' : ''}
                {slotsRemaining} founding {slotsRemaining === 1 ? 'slot' : 'slots'} left
              </h3>
            </div>
            <p className="text-sm text-amber-800/70 max-w-md">
              Lock in Premium forever at {fmt(foundingMonthlyCents)}/month for {fmt(foundingAnnualized)} a year.
              {' '}That saves {fmt(versusPremiumMonthly)} versus Premium Monthly and {fmt(versusPremiumAnnual)} versus Premium Annual.
              {' '}Exclusive founding member badge on your profile.
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-amber-800/60">
                <span>{slotsTaken} claimed</span>
                <span>{STRIPE_FOUNDING_MEMBER_LIMIT} total</span>
              </div>
              <Progress
                value={percentFilled}
                className="h-2 bg-amber-200/50"
              />
            </div>
          </div>
          <Link
            href="/dashboard/billing"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'shrink-0 bg-amber-600 hover:bg-amber-700 text-white'
            )}
          >
            Claim now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
