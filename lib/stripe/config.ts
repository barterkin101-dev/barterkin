/**
 * Stripe client-side configuration.
 * Only exposes the publishable key — never the secret key.
 */

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
