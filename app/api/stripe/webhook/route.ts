import { NextResponse, type NextRequest } from 'next/server'
import { getStripe, getWebhookSecret } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'
import { captureEvent } from '@/lib/analytics'
import type Stripe from 'stripe'

const log = createLogger('stripe-webhook')

type BillingInterval = 'monthly' | 'annual'

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events for subscription lifecycle.
 * Auth: Stripe signature verification (no session cookie).
 */
export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature = request.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(payload, signature, getWebhookSecret())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    log.warn('Stripe webhook signature verification failed', { context: { error: message } })
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }

  log.info('Stripe webhook received', { context: { type: event.type, id: event.id } })

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionCompleted(session, supabase)
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentSucceeded(invoice, supabase)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice, supabase)
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await syncSubscription(subscription, supabase)
        break
      }
      default:
        log.debug('Unhandled Stripe webhook event', { context: { type: event.type } })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook handler error'
    log.error('Stripe webhook handler error', {
      context: { error: message, event_type: event.type, event_id: event.id },
    })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const profileId = session.metadata?.profile_id
  if (!profileId) {
    log.warn('checkout.session.completed missing profile_id', { context: { session_id: session.id } })
    return
  }

  const tier = (session.metadata?.tier as 'premium' | 'founding') ?? 'premium'
  const billingInterval = normalizeBillingInterval(session.metadata?.billing_interval)

  const { error } = await supabase
    .from('profiles')
    .update({
      tier,
      billing_interval: billingInterval,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
    })
    .eq('id', profileId)

  if (error) {
    log.error('Failed to update profile after checkout', {
      context: { error: error.message, profile_id: profileId },
    })
    throw error
  }

  log.info('Profile upgraded after checkout', { context: { profile_id: profileId, tier } })

  // Track actual conversion (not just checkout initiation)
  void captureEvent(profileId, 'subscription_activated', {
    tier,
    source: 'stripe_webhook',
    event_type: 'checkout.session.completed',
  })
}

async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const subscriptionId = (invoice as unknown as Record<string, unknown>).subscription as string | null
  if (!subscriptionId) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tier, billing_interval')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle()

  if (!profile) {
    log.warn('Invoice payment succeeded but no matching profile', {
      context: { subscription_id: subscriptionId },
    })
    return
  }

  // Recover the canonical subscription state from Stripe so reactivations
  // restore the correct tier, interval, and renewal date.
  if (profile.tier === 'free' || !profile.billing_interval) {
    const stripe = getStripe()
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    await syncSubscription(subscription, supabase)
    log.info('Reactivated subscription after successful payment', {
      context: { profile_id: profile.id, subscription_id: subscriptionId },
    })
  }
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const subscriptionId = (invoice as unknown as Record<string, unknown>).subscription as string | null
  if (!subscriptionId) return

  // Downgrade to free on payment failure (grace period handled by subscription_current_period_end)
  const { error } = await supabase
    .from('profiles')
    .update({ tier: 'free', billing_interval: null })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    log.error('Failed to downgrade profile after payment failure', {
      context: { error: error.message, subscription_id: subscriptionId },
    })
  } else {
    log.info('Downgraded profile after payment failure', { context: { subscription_id: subscriptionId } })
  }
}

async function syncSubscription(
  subscription: Stripe.Subscription,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const profileId = subscription.metadata?.profile_id
  if (!profileId) {
    // Fallback: lookup by subscription ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle()

    if (!profile) {
      log.warn('Subscription sync: no profile found', {
        context: { subscription_id: subscription.id },
      })
      return
    }
  }

  const isActive = subscription.status === 'active' || subscription.status === 'trialing'
  const tier = isActive
    ? (subscription.metadata?.tier as 'premium' | 'founding' | undefined) ?? 'premium'
    : 'free'
  const billingInterval = isActive ? getSubscriptionBillingInterval(subscription) : null

  const targetId = profileId ?? (
    await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle()
  )?.data?.id

  if (!targetId) {
    log.warn('Subscription sync: could not resolve profile_id', {
      context: { subscription_id: subscription.id },
    })
    return
  }

  const periodEnd =
    subscription.items.data[0]?.current_period_end ?? null

  const { error } = await supabase
    .from('profiles')
    .update({
      tier,
      billing_interval: billingInterval,
      stripe_subscription_id: subscription.id,
      subscription_current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    })
    .eq('id', targetId)

  if (error) {
    log.error('Failed to sync subscription', {
      context: { error: error.message, profile_id: targetId, subscription_id: subscription.id },
    })
    throw error
  }

  log.info('Subscription synced', {
    context: { profile_id: targetId, tier, status: subscription.status },
  })
}

function normalizeBillingInterval(value: string | undefined): BillingInterval | null {
  if (value === 'monthly' || value === 'annual') {
    return value
  }

  return null
}

function getSubscriptionBillingInterval(subscription: Stripe.Subscription): BillingInterval | null {
  const metadataInterval = normalizeBillingInterval(subscription.metadata?.billing_interval)
  if (metadataInterval) {
    return metadataInterval
  }

  const interval = subscription.items.data[0]?.price.recurring?.interval
  if (interval === 'month') {
    return 'monthly'
  }

  if (interval === 'year') {
    return 'annual'
  }

  return null
}
