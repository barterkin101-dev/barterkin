import type { ListingRow } from '@/lib/data/listings.types'
import { FREE_LISTING_LIMIT, countsTowardListingLimit } from '@/lib/listing-limits'
import {
  BILLING_PLAN_AMOUNTS,
  formatUsdFromCents,
  getPremiumAnnualSavings,
} from '@/lib/stripe/config'

export interface DashboardListingCapUpsellProps {
  used: number
  limit: number
  remaining: number
  isAtLimit: boolean
  premiumMonthlyPrice: string
  premiumAnnualSavings: string
}

export function getDashboardListingCapUpsellProps(
  tier: string | null | undefined,
  listings: ListingRow[],
): DashboardListingCapUpsellProps | null {
  if (tier !== 'free') {
    return null
  }

  const used = listings.filter((listing) => countsTowardListingLimit(listing.status)).length
  const remaining = Math.max(0, FREE_LISTING_LIMIT - used)

  if (remaining > 1) {
    return null
  }

  const annualSavings = getPremiumAnnualSavings()

  return {
    used,
    limit: FREE_LISTING_LIMIT,
    remaining,
    isAtLimit: remaining === 0,
    premiumMonthlyPrice: formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumMonthlyCents),
    premiumAnnualSavings: formatUsdFromCents(annualSavings.totalSavingsCents),
  }
}
