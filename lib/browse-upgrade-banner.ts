import { FREE_CONTACT_LIMIT, PREMIUM_CONTACT_LIMIT } from '@/lib/contact-limits'
import type { ContactLimitStatus } from '@/lib/data/contact-limit'
import {
  BILLING_PLAN_AMOUNTS,
  formatUsdFromCents,
  getPremiumAnnualSavings,
} from '@/lib/stripe/config'

export type BrowseUpgradeBannerPlacement = 'directory' | 'listings'

export interface BrowseUpgradeBannerProps {
  placement: BrowseUpgradeBannerPlacement
  used: number
  limit: number
  premiumMonthlyPrice: string
  premiumAnnualSavings: string
  premiumContactLimit: number
  extraContactCapacity: number
  extraContactCostPerSlot: string
}

export function getBrowseUpgradeBannerProps(
  placement: BrowseUpgradeBannerPlacement,
  tier: string | null | undefined,
  contactLimitStatus: ContactLimitStatus | null,
): BrowseUpgradeBannerProps | null {
  if (tier !== 'free' || !contactLimitStatus?.isAtLimit) {
    return null
  }

  const extraContactCapacity = Math.max(0, PREMIUM_CONTACT_LIMIT - FREE_CONTACT_LIMIT)
  const savings = getPremiumAnnualSavings()

  return {
    placement,
    used: contactLimitStatus.used,
    limit: contactLimitStatus.limit,
    premiumMonthlyPrice: formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumMonthlyCents),
    premiumAnnualSavings: formatUsdFromCents(savings.totalSavingsCents),
    premiumContactLimit: PREMIUM_CONTACT_LIMIT,
    extraContactCapacity,
    extraContactCostPerSlot: formatUsdFromCents(
      Math.round(BILLING_PLAN_AMOUNTS.premiumMonthlyCents / extraContactCapacity),
    ),
  }
}
