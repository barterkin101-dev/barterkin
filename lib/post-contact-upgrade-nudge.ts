import { PREMIUM_CONTACT_LIMIT } from '@/lib/contact-limits'
import type { ContactLimitStatus } from '@/lib/data/contact-limit'
import {
  BILLING_PLAN_AMOUNTS,
  formatUsdFromCents,
  getPremiumAnnualSavings,
} from '@/lib/stripe/config'

export interface PostContactUpgradeNudgeProps {
  used: number
  limit: number
  remaining: number
  premiumMonthlyPrice: string
  premiumAnnualSavings: string
  premiumContactLimit: number
}

export function getPostContactUpgradeNudgeProps(
  tier: string,
  contactLimitStatus: ContactLimitStatus | null,
): PostContactUpgradeNudgeProps | null {
  if (tier !== 'free' || !contactLimitStatus || contactLimitStatus.remaining > 1) {
    return null
  }

  return {
    used: contactLimitStatus.used,
    limit: contactLimitStatus.limit,
    remaining: contactLimitStatus.remaining,
    premiumMonthlyPrice: formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumMonthlyCents),
    premiumAnnualSavings: formatUsdFromCents(getPremiumAnnualSavings().totalSavingsCents),
    premiumContactLimit: PREMIUM_CONTACT_LIMIT,
  }
}
