import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, getPriceIds } from '@/lib/stripe/server'
import { createLogger } from '@/lib/utils/logger'
import { captureEvent } from '@/lib/analytics'

const log = createLogger('stripe-checkout-api')

/**
 * POST /api/stripe/checkout-session
 * Creates a Stripe Checkout session for subscription upgrade.
 * Auth: requires authenticated user.
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

  const body = await request.json().catch(() => ({}))
  const priceId = body.priceId as string | undefined

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'

  try {
    const stripe = getStripe()
    const priceIds = getPriceIds()

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
          price: priceId ?? priceIds.premiumMonthly,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/dashboard/billing?success=1`,
      cancel_url: `${siteUrl}/dashboard/billing?canceled=1`,
      metadata: {
        profile_id: profile.id,
        user_id: user.id,
        tier: 'premium',
      },
      subscription_data: {
        metadata: {
          profile_id: profile.id,
          user_id: user.id,
        },
      },
    })

    captureEvent('checkout_session_created', {
      profile_id: profile.id,
      tier: 'premium',
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
