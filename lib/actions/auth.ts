'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isDisposableEmail } from '@/lib/utils/disposable-email'
import { checkSignupRateLimit } from '@/lib/utils/rate-limit'

export const MagicLinkSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  captchaToken: z.string().min(1).max(2048),
})

export interface SendMagicLinkResult {
  ok: boolean
  error?: string
}

/**
 * AUTH-02 + AUTH-06 + AUTH-07 + AUTH-08: Send a magic link with
 *   - Zod validation
 *   - Disposable-email rejection (AUTH-07 trust gate)
 *   - Per-IP rate limit check (AUTH-06)
 *   - Turnstile captchaToken passed to Supabase (AUTH-08)
 *
 * Returns { ok: true } identically for new and existing emails (anti-enumeration).
 * Returns { ok: false, error } with UI-SPEC-locked copy on known failure modes.
 *
 * This action is intended to be invoked via React 19 useActionState:
 *   const [state, formAction, pending] = useActionState(sendMagicLink, null)
 */
export async function sendMagicLink(
  _prevState: SendMagicLinkResult | null,
  formData: FormData,
): Promise<SendMagicLinkResult> {
  // 1. Zod-parse + normalize
  const parsed = MagicLinkSchema.safeParse({
    email: formData.get('email'),
    captchaToken: formData.get('cf-turnstile-response'),
  })
  if (!parsed.success) {
    return { ok: false, error: 'Please enter a valid email.' }
  }
  const { email, captchaToken } = parsed.data

  // 2. AUTH-07: disposable-email rejection (trust gate)
  if (isDisposableEmail(email)) {
    return {
      ok: false,
      error:
        "That email provider isn't supported. Please use a personal email (Gmail, Outlook, iCloud, or your own domain).",
    }
  }

  // 3. AUTH-06: per-IP rate limit
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

  // 4. AUTH-02 + AUTH-08: signInWithOtp with captchaToken passed to Supabase.
  //    Supabase Auth server calls Cloudflare /siteverify ONCE — do NOT double-verify here.
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
      // deliberately NOT logging error.message or email — may contain PII
    })
    return { ok: false, error: 'Something went wrong. Please try again in a moment.' }
  }

  // Identical response for new and existing emails (anti-enumeration — T-2-09).
  return { ok: true }
}
