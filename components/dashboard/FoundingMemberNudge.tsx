import Link from 'next/link'
import { Zap, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatUsdFromCents, STRIPE_FOUNDING_MEMBER_LIMIT } from '@/lib/stripe/config'

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
  const normalizedSlotsRemaining = Math.min(
    STRIPE_FOUNDING_MEMBER_LIMIT,
    Math.max(0, slotsRemaining),
  )
  const slotsTaken = STRIPE_FOUNDING_MEMBER_LIMIT - normalizedSlotsRemaining
  const percentFilled = Math.round((slotsTaken / STRIPE_FOUNDING_MEMBER_LIMIT) * 100)
  const isUrgent = normalizedSlotsRemaining <= 10

  const foundingAnnualized = foundingMonthlyCents * 12
  const premiumAnnualEffectiveMonthlyCents = premiumAnnualCents / 12
  const versusPremiumMonthly = (premiumMonthlyCents * 12) - foundingAnnualized
  const versusPremiumAnnual = premiumAnnualCents - foundingAnnualized
  const savingsComparisons = [
    versusPremiumMonthly > 0
      ? `${formatUsdFromCents(versusPremiumMonthly)} versus Premium Monthly`
      : null,
    versusPremiumAnnual > 0
      ? `${formatUsdFromCents(versusPremiumAnnual)} versus Premium Annual`
      : null,
  ].filter((comparison): comparison is string => comparison !== null)

  const pricingSummary = savingsComparisons.length === 0
    ? null
    : savingsComparisons.length === 1
      ? `That saves ${savingsComparisons[0]}.`
      : `That saves ${savingsComparisons[0]} and ${savingsComparisons[1]}.`
  const monthlySavingsComparisons = [
    premiumMonthlyCents > foundingMonthlyCents
      ? `Save ${formatUsdFromCents(premiumMonthlyCents - foundingMonthlyCents)}/mo vs Premium monthly`
      : null,
    premiumAnnualEffectiveMonthlyCents > foundingMonthlyCents
      ? `Save ${formatUsdFromCents(premiumAnnualEffectiveMonthlyCents - foundingMonthlyCents)}/mo vs Premium annual`
      : null,
  ].filter((comparison): comparison is string => comparison !== null)

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
                {normalizedSlotsRemaining} founding {normalizedSlotsRemaining === 1 ? 'slot' : 'slots'} left
              </h3>
              {isUrgent && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                  {normalizedSlotsRemaining <= 5 ? 'Only ' : 'Just '}{normalizedSlotsRemaining} left
                </span>
              )}
            </div>
            <p className="text-sm text-amber-800/70 max-w-md">
              Lock in Premium forever at {formatUsdFromCents(foundingMonthlyCents)}/month for {formatUsdFromCents(foundingAnnualized)} a year.
              {pricingSummary ? ` ${pricingSummary}` : ''}
              {' '}Exclusive founding member badge on your profile.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-amber-900/80">
              <span className="rounded-full bg-white/80 px-3 py-1">
                Founding {formatUsdFromCents(foundingMonthlyCents)}/mo
              </span>
              <span className="rounded-full bg-white/70 px-3 py-1">
                Premium annual {formatUsdFromCents(premiumAnnualEffectiveMonthlyCents)}/mo
              </span>
              <span className="rounded-full bg-white/70 px-3 py-1">
                Premium monthly {formatUsdFromCents(premiumMonthlyCents)}/mo
              </span>
            </div>
            {monthlySavingsComparisons.length > 0 && (
              <p className="text-xs text-amber-900/75">
                {monthlySavingsComparisons.join(' • ')}
              </p>
            )}
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
