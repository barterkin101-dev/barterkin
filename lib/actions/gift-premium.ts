/**
 * Gift Premium email action
 *
 * Sends a gift redemption email after a gift purchase is confirmed.
 * Idempotent — uses gift_purchases.status to prevent duplicate sends.
 */
import 'server-only'
import { Resend } from 'resend'
import { GiftPremiumEmail } from '@/emails/gift-premium'
import { captureEvent } from '@/lib/analytics'
import { createLogger } from '@/lib/utils/logger'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const log = createLogger('gift-premium-email')

export async function sendGiftPremiumEmail(giftPurchaseId: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'

  if (!apiKey) {
    log.error('RESEND_API_KEY not configured')
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    const admin = getSupabaseAdmin()

    // Fetch gift purchase with purchaser info
    const { data: gift, error: giftError } = await admin
      .from('gift_purchases')
      .select('id, recipient_email, purchaser_id, tier, billing_interval, status, stripe_checkout_session_id')
      .eq('id', giftPurchaseId)
      .maybeSingle()

    if (giftError || !gift) {
      log.warn('Gift purchase not found', { context: { gift_purchase_id: giftPurchaseId, error: giftError?.message } })
      return { ok: false, error: 'gift_not_found' }
    }

    if (gift.status !== 'pending') {
      return { ok: true } // Already sent / redeemed
    }

    // Get purchaser profile
    const { data: purchaser } = await admin
      .from('profiles')
      .select('display_name, username')
      .eq('id', gift.purchaser_id)
      .maybeSingle()

    const tierLabel = gift.tier === 'founding' ? 'Founding Member' : 'Premium'
    const billingIntervalLabel = gift.billing_interval === 'annual' ? 'billed annually' : 'billed monthly'
    const redemptionUrl = `${siteUrl}/gift/redeem?token=${gift.id}`

    const resend = new Resend(apiKey)

    await resend.emails.send({
      from: 'Barterkin <hello@barterkin.com>',
      to: [gift.recipient_email],
      subject: `${purchaser?.display_name ?? purchaser?.username ?? 'Someone'} gifted you ${tierLabel} on Barterkin`,
      react: GiftPremiumEmail({
        recipientName: null, // We don't know the recipient's name yet
        purchaserName: purchaser?.display_name ?? purchaser?.username ?? 'Someone',
        redemptionUrl,
        siteUrl,
        tierLabel,
        billingIntervalLabel,
      }),
    })

    log.info('Gift premium email sent', {
      context: { gift_purchase_id: giftPurchaseId, recipient_email: gift.recipient_email },
    })

    void captureEvent(gift.purchaser_id, 'premium_gift_email_sent', {
      gift_purchase_id: giftPurchaseId,
      recipient_email: gift.recipient_email,
      tier: gift.tier,
      billing_interval: gift.billing_interval,
    })

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log.error('Failed to send gift premium email', {
      context: { gift_purchase_id: giftPurchaseId, error: message },
    })
    return { ok: false, error: message }
  }
}
