import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, getPriceIds } from '@/lib/stripe/server'
import { createLogger } from '@/lib/utils/logger'
import type Stripe from 'stripe'

const log = createLogger('stripe-portal-api')

/**
 * POST /api/stripe/customer-portal
 * Creates a Stripe Billing Portal session for the authenticated member.
 * Body: { flow?: 'switch_to_annual' } — preconfigures the portal for plan switching.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, stripe_customer_id, stripe_subscription_id, tier, billing_interval')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ ok: false, error: 'No billing account found.' }, { status: 404 })
  }

  let body: { flow?: 'switch_to_annual' } = {}
  try {
    body = await request.json()
  } catch {
    // empty body is fine
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'

  try {
    const stripe = getStripe()
    const priceIds = getPriceIds()

    const sessionConfig: Stripe.BillingPortal.SessionCreateParams = {
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl}/dashboard/billing`,
    }

    // Preconfigure subscription_update flow for monthly → annual switch
    if (body.flow === 'switch_to_annual' && profile.billing_interval === 'monthly' && profile.tier === 'premium') {
      if (priceIds.premiumAnnual) {
        sessionConfig.flow_data = {
          type: 'subscription_update',
          subscription_update: {
            subscription: profile.stripe_subscription_id!,
            items: [
              {
                id: 'item_1',
                price: priceIds.premiumAnnual,
                quantity: 1,
              },
            ],
          },
        }
      }
    }

    const session = await stripe.billingPortal.sessions.create(sessionConfig)

    return NextResponse.json({ ok: true, url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Portal failed.'
    log.error('customer portal creation failed', {
      context: { error: message, profile_id: profile.id },
    })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
