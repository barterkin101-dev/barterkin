'use server'

import { headers } from 'next/headers'
import { getLandingHeroExperimentProperties } from '@/lib/ab-testing-shared'
import { createClient } from '@/lib/supabase/server'
import { isDisposableEmail } from '@/lib/utils/disposable-email'
import { checkSignupRateLimit } from '@/lib/utils/rate-limit'
import { limitAuthRequest } from '@/lib/rate-limit-public'
import { MagicLinkSchema, type SendMagicLinkResult } from '@/lib/schemas/auth'
import { createLogger } from '@/lib/utils/logger'
import { captureEvent } from '@/lib/analytics'

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
  const experimentProperties = getLandingHeroExperimentProperties(
    formData.get('landingHeroVariant')?.toString(),
  )

  if (isDisposableEmail(email)) {
    return {
      ok: false,
      error:
        "That email provider isn't supported. Please use a personal email (Gmail, Outlook, iCloud, or your own domain).",
    }
  }

  const hdrs = await headers()
  const ip = (hdrs.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'

  // Layer 1: IP-based auth request rate limit (5 per 15 min) — fast, Redis-backed
  const authLimit = await limitAuthRequest(ip)
  if (!authLimit.success) {
    return {
      ok: false,
      error:
        'Too many requests from this network. Please try again in a few minutes.',
    }
  }

  // Layer 2: Postgres per-IP signup counter (5 per day) — authoritative, persistent
  const rl = await checkSignupRateLimit(ip)
  if (!rl.allowed) {
    return {
      ok: false,
      error:
        'Too many signups from this network today. Please try again tomorrow, or contact us if you think this is a mistake.',
    }
  }

  const supabase = await createClient()

  // Build email redirect URL with referral code if present
  const referralCode = formData.get('referral-code') as string | null
  const normalizedRef = referralCode ? referralCode.trim().toUpperCase() : null
  const landingHeroVariant = experimentProperties.landing_hero_variant
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const emailRedirectUrl = new URL('/auth/confirm', siteUrl)

  if (normalizedRef) {
    emailRedirectUrl.searchParams.set('ref', normalizedRef)
  }

  if (landingHeroVariant) {
    emailRedirectUrl.searchParams.set('abv', landingHeroVariant)
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      captchaToken,
      emailRedirectTo: emailRedirectUrl.toString(),
      shouldCreateUser: true,
    },
  })
  if (error) {
    const log = createLogger('auth')
    log.error('signInWithOtp failed', {
      error,
      context: { code: error.code, status: error.status },
    })
    return { ok: false, error: 'Something went wrong. Please try again in a moment.' }
  }

  void captureEvent(email, 'signup_started', {
    method: 'magic_link',
    ...experimentProperties,
  })

  return { ok: true }
}
