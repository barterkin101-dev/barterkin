'use server'

import { createClient } from '@/lib/supabase/server'
import { WaitlistSchema, type JoinWaitlistResult } from '@/lib/schemas/waitlist'
import { isDisposableEmail } from '@/lib/utils/disposable-email'
import { validateAndSanitize } from '@/lib/utils/validation'
import { getClientIp, limitAuthRequest } from '@/lib/rate-limit-public'
import { createLogger } from '@/lib/utils/logger'
import { captureEvent } from '@/lib/analytics'
import { Resend } from 'resend'

export type { JoinWaitlistResult }

export async function joinWaitlist(
  _prev: JoinWaitlistResult | null,
  formData: FormData,
): Promise<JoinWaitlistResult> {
  const parsed = validateAndSanitize(WaitlistSchema, {
    email: formData.get('email'),
    countyId: formData.get('countyId'),
  })
  if (!parsed.ok) {
    return { ok: false, error: 'Please enter a valid email address.' }
  }
  const { email, countyId } = parsed.data

  if (isDisposableEmail(email)) {
    return {
      ok: false,
      error:
        "That email provider isn't supported. Please use a personal email (Gmail, Outlook, iCloud, or your own domain).",
    }
  }

  // Rate limit: same bucket as auth requests (5 per 15 min per IP)
  const ip = await getClientIp()
  const limit = await limitAuthRequest(ip)
  if (!limit.success) {
    return {
      ok: false,
      error: 'Too many requests from this network. Please try again in a few minutes.',
    }
  }

  const supabase = await createClient()

  // Upsert into waitlist (idempotent — no error on duplicate)
  const { error: insertErr } = await supabase
    .from('waitlist')
    .insert({ email, county_id: countyId ?? null, source: 'hero_cta' })

  if (insertErr) {
    // 23505 unique_violation = already on waitlist
    if (insertErr.code === '23505') {
      return { ok: true, alreadyJoined: true }
    }
    const log = createLogger('waitlist')
    log.error('waitlist insert failed', { error: insertErr, context: { code: insertErr.code } })
    return { ok: false, error: 'Something went wrong. Please try again in a moment.' }
  }

  // Send confirmation email (non-blocking)
  try {
    const apiKey = process.env.RESEND_API_KEY
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'
    if (apiKey) {
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from: 'Barterkin <hello@barterkin.com>',
        to: [email],
        subject: "You're on the Barterkin waitlist",
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the Barterkin waitlist</title>
</head>
<body style="margin:0;padding:32px 16px;background:#eef3e8;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#f4f7f0;border-radius:8px;overflow:hidden;border:1px solid #dfe8d5;">
    <div style="background:#2d5a27;padding:24px 32px;">
      <h1 style="color:#eef3e8;font-family:Lora,Georgia,serif;font-size:22px;margin:0;">Barterkin</h1>
      <p style="color:#eef3e8;font-size:13px;margin:4px 0 0 0;">Georgia Barter Network</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1e4420;font-family:Lora,Georgia,serif;font-size:22px;margin-bottom:16px;">You're on the list!</h2>
      <p style="color:#1e4420;font-size:15px;line-height:1.6;margin-bottom:24px;">
        Thanks for your interest in Barterkin. We'll let you know as soon as spots open in your area.
      </p>
      <p style="color:#1e4420;font-size:15px;line-height:1.6;margin-bottom:24px;">
        In the meantime, you can <a href="${siteUrl}/signup" style="color:#c4956a;text-decoration:underline;">create your profile now</a> and skip the line.
      </p>
      <hr style="border-color:#dfe8d5;margin:32px 0 16px 0;">
      <p style="color:#3a7032;font-size:12px;line-height:1.5;margin:0;">
        Georgia Barter Network · <a href="${siteUrl}" style="color:#c4956a;">${siteUrl.replace(/^https?:\/\//, '')}</a>
      </p>
    </div>
  </div>
</body>
</html>`,
      })
    }
  } catch (err) {
    const log = createLogger('waitlist')
    log.error('waitlist confirmation email failed', { error: err, context: { code: (err as Error).name } })
    // Don't fail the user flow if email fails
  }

  void captureEvent(email, 'waitlist_joined', {
    source: 'hero_cta',
    county_id: countyId ?? null,
  })

  return { ok: true }
}
