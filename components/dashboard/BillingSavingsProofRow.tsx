import { BILLING_PLAN_AMOUNTS, formatUsdFromCents, getPremiumAnnualSavings } from '@/lib/stripe/config'

export function BillingSavingsProofRow() {
  const annualSavings = getPremiumAnnualSavings()
  const premiumMonthlyPrice = formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumMonthlyCents)
  const premiumAnnualPrice = formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumAnnualCents)
  const annualEquivalentPrice = formatUsdFromCents(annualSavings.monthlyEquivalentCents)

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-foreground">
        Monthly: {premiumMonthlyPrice}/mo
      </div>
      <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-950">
        Annual: {premiumAnnualPrice}/yr
      </div>
      <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-950">
        Effective: {annualEquivalentPrice}/mo billed yearly
      </div>
    </div>
  )
}
