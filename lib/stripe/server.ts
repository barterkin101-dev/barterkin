import Stripe from 'stripe'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('stripe')

let _stripe: Stripe | null = null

function initStripe(): Stripe {
  if (_stripe) return _stripe
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    log.error('Stripe not initialized: STRIPE_SECRET_KEY missing')
    throw new Error('Stripe is not configured.')
  }
  _stripe = new Stripe(secretKey, {
    apiVersion: '2026-04-22.dahlia',
    typescript: true,
  })
  return _stripe
}

export function getStripe(): Stripe {
  return initStripe()
}

/** Price IDs — set in environment, validated at runtime. */
export function getPriceIds() {
  const premiumMonthly = process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID
  const premiumAnnual = process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID
  const foundingMonthly = process.env.STRIPE_FOUNDING_MONTHLY_PRICE_ID

  if (!premiumMonthly) {
    log.error('STRIPE_PREMIUM_MONTHLY_PRICE_ID not set')
    throw new Error('Stripe price configuration missing.')
  }

  return {
    premiumMonthly,
    premiumAnnual: premiumAnnual ?? null,
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
