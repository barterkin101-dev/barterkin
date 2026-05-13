import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/server'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('stripe-portal-api')

/**
 * POST /api/stripe/customer-portal
 * Creates a Stripe Billing Portal session for the authenticated member.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, stripe_customer_id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ ok: false, error: 'No billing account found.' }, { status: 404 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'

  try {
    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl}/dashboard/billing`,
    })

    return NextResponse.json({ ok: true, url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Portal failed.'
    log.error('customer portal creation failed', {
      context: { error: message, profile_id: profile.id },
    })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
