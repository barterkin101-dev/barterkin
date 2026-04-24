'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isDisposableEmail } from '@/lib/utils/disposable-email'
import { checkSignupRateLimit } from '@/lib/utils/rate-limit'
import { MagicLinkSchema, type SendMagicLinkResult } from '@/lib/schemas/auth'

export type { SendMagicLinkResult }

export async function sendMagicLink(
  _prevState: SendMagicLinkResult | null,
  formData: FormData,
): Promise<SendMagicLinkResult> {
  const parsed = MagicLinkSchema.safeParse({
    email: formData.get('email'),
    captchaToken: formData.get('cf-turnstile-response'),
  })
  if (!parsed.success) {
    return { ok: false, error: 'Please enter a valid email.' }
  }
  const { email, captchaToken } = parsed.data

  if (isDisposableEmail(email)) {
    return {
      ok: false,
      error:
        "That email provider isn't supported. Please use a personal email (Gmail, Outlook, iCloud, or your own domain).",
    }
  }

  const hdrs = await headers()
  const ip = (hdrs.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  const rl = await checkSignupRateLimit(ip)
  if (!rl.allowed) {
    return {
      ok: false,
      error:
        'Too many signups from this network today. Please try again tomorrow, or contact us if you think this is a mistake.',
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      captchaToken,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/confirm`,
      shouldCreateUser: true,
    },
  })
  if (error) {
    console.error('[sendMagicLink] signInWithOtp failed', {
      code: error.code,
      status: error.status,
    })
    return { ok: false, error: 'Something went wrong. Please try again in a moment.' }
  }

  return { ok: true }
}
