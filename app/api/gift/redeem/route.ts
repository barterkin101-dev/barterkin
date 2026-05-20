import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/server'
import { createLogger } from '@/lib/utils/logger'
import { captureEvent } from '@/lib/analytics'

const log = createLogger('gift-redeem-api')

/**
 * POST /api/gift/redeem
 * Redeems a gift Premium subscription for the authenticated user.
 * Body: { token: string } — the gift_purchase.id
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })
  }

  let body: { token?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const token = body.token?.trim()
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Gift token is required.' }, { status: 400 })
  }

  try {
    // Fetch the gift purchase
    const { data: gift, error: giftError } = await supabase
      .from('gift_purchases')
      .select('id, purchaser_id, recipient_email, status, tier, billing_interval, stripe_subscription_id')
      .eq('id', token)
      .maybeSingle()

    if (giftError || !gift) {
      return NextResponse.json({ ok: false, error: 'Gift not found.' }, { status: 404 })
    }

    if (gift.status === 'redeemed') {
      return NextResponse.json({ ok: false, error: 'This gift has already been redeemed.' }, { status: 409 })
    }

    if (gift.status === 'expired') {
      return NextResponse.json({ ok: false, error: 'This gift has expired.' }, { status: 410 })
    }

    // Get the recipient's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, tier, email:owner_id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ ok: false, error: 'Profile not found.' }, { status: 404 })
    }

    // Check if recipient already has Premium
    if (profile.tier === 'premium' || profile.tier === 'founding') {
      return NextResponse.json(
        { ok: false, error: 'You already have an active Premium subscription.' },
        { status: 409 },
      )
    }

    // Update the gift purchase to redeemed
    const { error: updateError } = await supabase
      .from('gift_purchases')
      .update({
        status: 'redeemed',
        redeemed_at: new Date().toISOString(),
        redeemed_by_profile_id: profile.id,
      })
      .eq('id', token)

    if (updateError) {
      log.error('Failed to update gift_purchase to redeemed', {
        context: { error: updateError.message, gift_id: token },
      })
      return NextResponse.json({ ok: false, error: 'Failed to redeem gift.' }, { status: 500 })
    }

    // Update the recipient's profile with Premium tier
    // Note: The subscription is owned by the purchaser's Stripe customer.
    // We mark the recipient as premium but don't link stripe_customer_id/subscription_id
    // since the billing relationship stays with the purchaser.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        tier: gift.tier,
        billing_interval: gift.billing_interval,
      })
      .eq('id', profile.id)

    if (profileError) {
      log.error('Failed to update profile after gift redemption', {
        context: { error: profileError.message, profile_id: profile.id },
      })
      return NextResponse.json({ ok: false, error: 'Failed to activate Premium.' }, { status: 500 })
    }

    log.info('Gift redeemed successfully', {
      context: {
        gift_id: token,
        recipient_profile_id: profile.id,
        purchaser_id: gift.purchaser_id,
      },
    })

    // Track redemption
    void captureEvent(profile.id, 'premium_gift_redeemed', {
      gift_purchase_id: token,
      purchaser_id: gift.purchaser_id,
      tier: gift.tier,
      billing_interval: gift.billing_interval,
    })

    return NextResponse.json({ ok: true, tier: gift.tier })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Redemption failed.'
    log.error('Gift redemption failed', { context: { error: message, token } })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
