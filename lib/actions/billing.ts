'use server'

import { createClient } from '@/lib/supabase/server'
import { getStripe, getPriceIds } from '@/lib/stripe/server'
import { createLogger } from '@/lib/utils/logger'
import { captureEvent } from '@/lib/analytics'
import { STRIPE_FOUNDING_MEMBER_LIMIT } from '@/lib/stripe/config'
import type Stripe from 'stripe'

const log = createLogger('billing')

export interface CreateCheckoutResult {
  ok: boolean
  url?: string
  error?: string
}

export async function createCheckoutSession(
  _prev: CreateCheckoutResult | null,
  formData: FormData,
): Promise<CreateCheckoutResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return { ok: false, error: 'Not authenticated.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, stripe_customer_id, tier')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!profile) {
    return { ok: false, error: 'Profile not found.' }
  }

  // Prevent double-subscription
  if (profile.tier === 'premium' || profile.tier === 'founding') {
    return { ok: false, error: 'You already have an active subscription.' }
  }

  const requestedPlan = (formData.get('plan') as string) === 'founding' ? 'founding' : 'premium'
  let foundingCount: number | null = null

  // Check founding member limit
  if (requestedPlan === 'founding') {
    const { count, error: countErr } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tier', 'founding')

    foundingCount = count ?? null

    if (countErr) {
      log.error('founding member count failed', { context: { error: countErr.message } })
    }

    if ((foundingCount ?? 0) >= STRIPE_FOUNDING_MEMBER_LIMIT) {
      return { ok: false, error: 'Founding member slots are sold out. Choose Premium instead.' }
    }
  }

  const returnUrl = formData.get('returnUrl') as string | null
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'
  const successUrl = `${siteUrl}/dashboard/billing?success=1`
  const cancelUrl = returnUrl ? `${siteUrl}${returnUrl}?canceled=1` : `${siteUrl}/dashboard/billing?canceled=1`

  try {
    const stripe = getStripe()
    const priceIds = getPriceIds()

    const selectedPriceId =
      requestedPlan === 'founding' && priceIds.foundingMonthly
        ? priceIds.foundingMonthly
        : priceIds.premiumMonthly

    // Create Stripe customer if not exists
    let customerId = profile.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile.display_name ?? undefined,
        metadata: { profile_id: profile.id, user_id: user.id },
      })
      customerId = customer.id
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', profile.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: selectedPriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        profile_id: profile.id,
        user_id: user.id,
        tier: requestedPlan,
      },
      subscription_data: {
        metadata: {
          profile_id: profile.id,
          user_id: user.id,
          tier: requestedPlan,
        },
      },
    })

    captureEvent(profile.id, 'checkout_session_created', {
      tier: requestedPlan,
    })

    if (requestedPlan === 'founding') {
      captureEvent(profile.id, 'founding_slot_claimed', {
        profile_id: profile.id,
        slots_remaining_before: (foundingCount ?? 0),
      })
    }

    return { ok: true, url: session.url ?? undefined }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed.'
    log.error('checkout session creation failed', { context: { error: message, profile_id: profile.id } })
    return { ok: false, error: message }
  }
}

export interface CreatePortalResult {
  ok: boolean
  url?: string
  error?: string
}

export async function createCustomerPortalSession(
  _prev: CreatePortalResult | null,
): Promise<CreatePortalResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return { ok: false, error: 'Not authenticated.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, stripe_customer_id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!profile?.stripe_customer_id) {
    return { ok: false, error: 'No billing account found.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'

  try {
    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl}/dashboard/billing`,
    })

    return { ok: true, url: session.url }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Portal failed.'
    log.error('customer portal creation failed', { context: { error: message, profile_id: profile.id } })
    return { ok: false, error: message }
  }
}

/** Sync subscription status from Stripe webhook payload. */
export async function syncSubscriptionFromStripe(
  subscription: Stripe.Subscription,
): Promise<void> {
  const supabase = await createClient()
  const profileId = subscription.metadata?.profile_id

  if (!profileId) {
    log.warn('Stripe subscription missing profile_id metadata', {
      context: { subscription_id: subscription.id },
    })
    return
  }

  const status = subscription.status
  const isActive = status === 'active' || status === 'trialing'
  const tier = isActive
    ? (subscription.metadata?.tier as 'premium' | 'founding' | undefined) ?? 'premium'
    : 'free'

  const { error } = await supabase
    .from('profiles')
    .update({
      tier,
      stripe_subscription_id: subscription.id,
      subscription_current_period_end: subscription.items.data[0]?.current_period_end
        ? new Date(subscription.items.data[0]?.current_period_end * 1000).toISOString()
        : null,
    })
    .eq('id', profileId)

  if (error) {
    log.error('Failed to sync subscription to profile', {
      context: { error: error.message, profile_id: profileId, subscription_id: subscription.id },
    })
    throw new Error(`DB sync failed: ${error.message}`)
  }

  captureEvent(profileId, isActive ? 'subscription_activated' : 'subscription_deactivated', {
    tier,
    stripe_status: status,
  })
}
