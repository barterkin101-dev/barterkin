import type { PremiumBillingInterval } from '@/lib/data/billing'
import { BILLING_PLAN_AMOUNTS, formatUsdFromCents, getPremiumAnnualSavings } from '@/lib/stripe/config'

export interface DashboardAnnualUpgradeSavingsProps {
  premiumMonthlyPrice: string
  premiumAnnualPrice: string
  premiumAnnualSavings: string
  annualEquivalentPrice: string
}

export function getDashboardAnnualUpgradeSavingsProps(
  tier: string | null | undefined,
  billingInterval: PremiumBillingInterval,
): DashboardAnnualUpgradeSavingsProps | null {
  if (tier !== 'premium' || billingInterval !== 'monthly') {
    return null
  }

  const annualSavings = getPremiumAnnualSavings()

  return {
    premiumMonthlyPrice: formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumMonthlyCents),
    premiumAnnualPrice: formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumAnnualCents),
    premiumAnnualSavings: formatUsdFromCents(annualSavings.totalSavingsCents),
    annualEquivalentPrice: formatUsdFromCents(annualSavings.monthlyEquivalentCents),
  }
}
