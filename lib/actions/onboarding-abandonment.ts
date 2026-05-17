/**
 * Onboarding abandonment drip email action
 *
 * Sends a warm reminder to members who signed up but never completed onboarding.
 * Idempotent — uses onboarding_reminder_sent_at to prevent duplicates.
 */
import 'server-only'
import { Resend } from 'resend'
import { OnboardingAbandonmentEmail } from '@/emails/onboarding-abandonment'
import { captureEvent } from '@/lib/analytics'
import {
  getOnboardingAbandonmentRecipients,
  recordOnboardingReminderSent,
} from '@/lib/data/onboarding-abandonment'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('onboarding-abandonment')

export async function sendOnboardingAbandonmentEmails(): Promise<{
  ok: boolean
  sent: number
  failed: number
  skipped: number
  error?: string
}> {
  const apiKey = process.env.RESEND_API_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'

  if (!apiKey) {
    log.error('RESEND_API_KEY not configured')
    return { ok: false, sent: 0, failed: 0, skipped: 0, error: 'RESEND_API_KEY not configured' }
  }

  const { recipients, error: recipientError } = await getOnboardingAbandonmentRecipients()

  if (recipientError) {
    return { ok: false, sent: 0, failed: 0, skipped: 0, error: recipientError }
  }

  if (recipients.length === 0) {
    return { ok: true, sent: 0, failed: 0, skipped: 0 }
  }

  const admin = getSupabaseAdmin()
  const resend = new Resend(apiKey)

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const recipient of recipients) {
    const { data: email, error: emailError } = await admin.rpc('profile_owner_email', {
      p_profile_id: recipient.id,
    })

    if (emailError) {
      log.error('Failed to resolve onboarding abandonment email', {
        error: emailError,
        context: { profile_id: recipient.id },
      })
      failed++
      continue
    }

    if (!email) {
      skipped++
      continue
    }

    try {
      await resend.emails.send({
        from: 'Barterkin <hello@barterkin.com>',
        to: [email],
        subject: "You're almost ready to start trading on Barterkin",
        react: OnboardingAbandonmentEmail({
          recipientName: recipient.display_name ?? recipient.username,
          siteUrl,
          onboardingUrl: `${siteUrl}/onboarding`,
        }),
      })

      const recordResult = await recordOnboardingReminderSent(recipient.id)
      if (!recordResult.ok) {
        log.error('Failed to record onboarding reminder sent after delivery', {
          error: recordResult.error,
          context: { profile_id: recipient.id },
        })
        failed++
        continue
      }

      void captureEvent(recipient.owner_id, 'onboarding_abandonment_email_sent', {
        method: 'resend',
      })

      sent++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error('Failed to send onboarding abandonment email', {
        error: err,
        context: { profile_id: recipient.id, email },
      })
      failed++
    }
  }

  if (sent > 0) {
    void captureEvent('system', 'onboarding_abandonment_batch_complete', {
      sent,
      failed,
      skipped,
    })
  }

  return { ok: true, sent, failed, skipped }
}
