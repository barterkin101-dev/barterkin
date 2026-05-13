import Stripe from 'stripe'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('stripe')

const secretKey = process.env.STRIPE_SECRET_KEY

export const stripe = secretKey
  ? new Stripe(secretKey, {
      apiVersion: '2025-04-30.basil',
      typescript: true,
    })
  : null

export function getStripe(): Stripe {
  if (!stripe) {
    log.error('Stripe not initialized: STRIPE_SECRET_KEY missing')
    throw new Error('Stripe is not configured.')
  }
  return stripe
}

/** Price IDs — set in environment, validated at runtime. */
export function getPriceIds() {
  const premiumMonthly = process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID
  const foundingMonthly = process.env.STRIPE_FOUNDING_MONTHLY_PRICE_ID

  if (!premiumMonthly) {
    log.error('STRIPE_PREMIUM_MONTHLY_PRICE_ID not set')
    throw new Error('Stripe price configuration missing.')
  }

  return {
    premiumMonthly,
    foundingMonthly: foundingMonthly ?? premiumMonthly,
  }
}

/** Webhook secret for signature verification. */
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    log.error('STRIPE_WEBHOOK_SECRET not set')
    throw new Error('Stripe webhook secret missing.')
  }
  return secret
}
