import 'server-only'

export type PremiumBillingInterval = 'monthly' | 'annual' | null

export function getPremiumBillingInterval(
  tier: string | null | undefined,
  billingInterval: string | null | undefined,
): PremiumBillingInterval {
  if (tier !== 'premium') {
    return null
  }

  if (billingInterval === 'monthly' || billingInterval === 'annual') {
    return billingInterval
  }

  return null
}
