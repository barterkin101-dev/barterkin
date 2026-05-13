import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getStripe, getPriceIds } from '@/lib/stripe/server'
import { createLogger } from '@/lib/utils/logger'
import { captureEvent } from '@/lib/analytics'
import { STRIPE_FOUNDING_MEMBER_LIMIT } from '@/lib/stripe/config'

const log = createLogger('stripe-checkout-api')

/**
 * POST /api/stripe/checkout-session
 * Creates a Stripe Checkout session for subscription upgrade.
 * Auth: requires authenticated user.
 * Body: { priceId?: 'premium' | 'founding' }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, stripe_customer_id, tier')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ ok: false, error: 'Profile not found.' }, { status: 404 })
  }

  if (profile.tier === 'premium' || profile.tier === 'founding') {
    return NextResponse.json({ ok: false, error: 'Already subscribed.' }, { status: 409 })
  }

  let body: { priceId?: string } = {}
  try {
    body = await request.json()
  } catch {
    // empty body is fine — defaults to premium
  }

  const requestedPlan = body.priceId === 'founding' ? 'founding' : 'premium'

  // Check founding member limit
  if (requestedPlan === 'founding') {
    const { count: foundingCount, error: countErr } = await getSupabaseAdmin()
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tier', 'founding')

    if (countErr) {
      log.error('founding member count failed', { context: { error: countErr.message } })
    }

    if ((foundingCount ?? 0) >= STRIPE_FOUNDING_MEMBER_LIMIT) {
      return NextResponse.json(
        { ok: false, error: 'Founding member slots are sold out. Choose Premium instead.' },
        { status: 409 },
      )
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'

  try {
    const stripe = getStripe()
    const priceIds = getPriceIds()

    const selectedPriceId =
      requestedPlan === 'founding' && priceIds.foundingMonthly
        ? priceIds.foundingMonthly
        : priceIds.premiumMonthly

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
      success_url: `${siteUrl}/dashboard/billing/success?tier=${requestedPlan}`,
      cancel_url: `${siteUrl}/dashboard/billing?canceled=1`,
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

    return NextResponse.json({ ok: true, url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed.'
    log.error('checkout session creation failed', {
      context: { error: message, profile_id: profile.id },
    })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
