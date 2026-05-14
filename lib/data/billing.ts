import 'server-only'

import { getStripe } from '@/lib/stripe/server'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('billing-data')

export type PremiumBillingInterval = 'monthly' | 'annual' | null

export async function getPremiumBillingInterval(
  tier: string | null | undefined,
  stripeSubscriptionId: string | null | undefined,
): Promise<PremiumBillingInterval> {
  if (tier !== 'premium' || !stripeSubscriptionId) {
    return null
  }

  try {
    const stripe = getStripe()
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
    const interval = subscription.items.data[0]?.price.recurring?.interval

    if (interval === 'month') {
      return 'monthly'
    }

    if (interval === 'year') {
      return 'annual'
    }

    return null
  } catch (error) {
    log.warn('Failed to resolve premium billing interval', {
      context: {
        stripe_subscription_id: stripeSubscriptionId,
        error: error instanceof Error ? error.message : 'unknown',
      },
    })
    return null
  }
}
