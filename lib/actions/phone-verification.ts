'use server'

import { revalidatePath } from 'next/cache'
import { captureEvent } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/server'
import type { PhoneVerificationResult } from '@/lib/actions/profile.types'
import { decryptPhoneNumber, encryptPhoneNumber } from '@/lib/utils/phone-encryption'
import { maskPhoneNumber, normalizePhoneNumber } from '@/lib/utils/phone'
import { createLogger } from '@/lib/utils/logger'
import {
  checkTwilioVerificationCode,
  type TwilioVerifyError,
  sendTwilioVerificationCode,
} from '@/lib/twilio/verify'

function mapTwilioError(error: unknown): PhoneVerificationResult {
  const twilioError = error as TwilioVerifyError
  if (twilioError?.code === 'misconfigured') {
    return { ok: false, code: 'misconfigured', error: 'Phone verification is not configured yet.' }
  }
  if (twilioError?.status === 429) {
    return { ok: false, code: 'rate_limited', error: 'Too many attempts. Please wait and try again.' }
  }
  return { ok: false, code: 'provider_error', error: 'Unable to contact the SMS verification service.' }
}

async function getProfilePhoneContext(userId: string) {
  const supabase = await createClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, phone_number, phone_verified')
    .eq('owner_id', userId)
    .maybeSingle()

  if (error) {
    const log = createLogger('phone-verification')
    log.error('load profile phone context failed', { error, context: { code: error.code } })
    return { supabase, profile: null, error: 'Something went wrong. Please try again.' }
  }

  return { supabase, profile, error: null }
}

function resolvePhoneNumber(rawPhoneNumber: FormDataEntryValue | null, encryptedPhoneNumber?: string | null) {
  const submittedPhoneNumber = typeof rawPhoneNumber === 'string' ? normalizePhoneNumber(rawPhoneNumber) : null
  if (submittedPhoneNumber) return submittedPhoneNumber
  if (!encryptedPhoneNumber) return null

  try {
    return normalizePhoneNumber(decryptPhoneNumber(encryptedPhoneNumber))
  } catch {
    return null
  }
}

export async function sendPhoneVerificationCode(
  _prev: PhoneVerificationResult | null,
  formData: FormData,
): Promise<PhoneVerificationResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, code: 'unauthorized', error: 'Not authenticated.' }

  const context = await getProfilePhoneContext(user.id)
  if (context.error) return { ok: false, code: 'provider_error', error: context.error }

  const phoneNumber = resolvePhoneNumber(formData.get('phoneNumber'), context.profile?.phone_number)
  if (!phoneNumber) {
    return { ok: false, code: 'invalid_phone', error: 'Enter a valid US phone number first.' }
  }

  try {
    await sendTwilioVerificationCode(phoneNumber)
  } catch (error) {
    const log = createLogger('phone-verification')
    log.warn('twilio send failed', { error })
    return mapTwilioError(error)
  }

  const encrypted = encryptPhoneNumber(phoneNumber)
  const { error: updateError } = await context.supabase
    .from('profiles')
    .upsert(
      {
        owner_id: user.id,
        phone_number: encrypted,
        phone_verified: false,
      },
      { onConflict: 'owner_id' },
    )
  if (updateError) {
    const log = createLogger('phone-verification')
    log.error('persist phone after send failed', { error: updateError, context: { code: updateError.code } })
    return { ok: false, code: 'provider_error', error: 'We sent the code, but could not save your phone number.' }
  }

  await captureEvent(user.id, 'phone_verification_code_sent', {
    phone_last4: phoneNumber.slice(-4),
  })
  revalidatePath('/profile/edit')
  revalidatePath('/dashboard/profile/edit')

  return {
    ok: true,
    maskedPhoneNumber: maskPhoneNumber(phoneNumber),
    verified: false,
  }
}

export async function verifyPhoneVerificationCode(
  _prev: PhoneVerificationResult | null,
  formData: FormData,
): Promise<PhoneVerificationResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, code: 'unauthorized', error: 'Not authenticated.' }

  const code = String(formData.get('code') ?? '').trim()
  if (!/^\d{4,10}$/.test(code)) {
    return { ok: false, code: 'invalid_code', error: 'Enter the 4-10 digit code from your text message.' }
  }

  const context = await getProfilePhoneContext(user.id)
  if (context.error) return { ok: false, code: 'provider_error', error: context.error }

  const phoneNumber = resolvePhoneNumber(formData.get('phoneNumber'), context.profile?.phone_number)
  if (!phoneNumber) {
    return { ok: false, code: 'not_found', error: 'Add a phone number before verifying it.' }
  }

  let status: Awaited<ReturnType<typeof checkTwilioVerificationCode>>
  try {
    status = await checkTwilioVerificationCode(phoneNumber, code)
  } catch (error) {
    const log = createLogger('phone-verification')
    log.warn('twilio verify failed', { error })
    return mapTwilioError(error)
  }

  if (status !== 'approved') {
    return {
      ok: false,
      code: 'invalid_code',
      error: status === 'max_attempts_reached'
        ? 'Too many incorrect codes. Request a new one and try again.'
        : 'That code did not match. Double-check it and try again.',
    }
  }

  const { error: updateError } = await context.supabase
    .from('profiles')
    .upsert(
      {
        owner_id: user.id,
        phone_number: encryptPhoneNumber(phoneNumber),
        phone_verified: true,
      },
      { onConflict: 'owner_id' },
    )
  if (updateError) {
    const log = createLogger('phone-verification')
    log.error('persist verified phone failed', { error: updateError, context: { code: updateError.code } })
    return { ok: false, code: 'provider_error', error: 'Your code was correct, but we could not save verification.' }
  }

  await captureEvent(user.id, 'phone_verified', {
    phone_last4: phoneNumber.slice(-4),
  })
  revalidatePath('/profile/edit')
  revalidatePath('/dashboard/profile/edit')

  return {
    ok: true,
    maskedPhoneNumber: maskPhoneNumber(phoneNumber),
    verified: true,
  }
}
