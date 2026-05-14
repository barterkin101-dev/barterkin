/**
 * Stripe client-side configuration.
 * Only exposes the publishable key — never the secret key.
 */

export const BILLING_PLAN_AMOUNTS = {
  premiumMonthlyCents: 900,
  premiumAnnualCents: 9000,
  foundingMonthlyCents: 500,
} as const

export function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

export function getPremiumAnnualSavings() {
  const monthly = BILLING_PLAN_AMOUNTS.premiumMonthlyCents
  const annual = BILLING_PLAN_AMOUNTS.premiumAnnualCents
  const annualizedMonthly = monthly * 12

  return {
    monthlyEquivalentCents: annual / 12,
    totalSavingsCents: annualizedMonthly - annual,
  }
}

export function getStripePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) {
    // In dev/test, return a placeholder so the build doesn't fail.
    // Runtime checks in the component will handle the missing key gracefully.
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return 'pk_test_placeholder'
    }
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
  }
  return key
}

export const STRIPE_FOUNDING_MEMBER_LIMIT = 100
