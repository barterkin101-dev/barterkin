'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ProfileFormSchema } from '@/lib/schemas/profile'
import { generateSlug } from '@/lib/utils/slug'
import { validateAndSanitize } from '@/lib/utils/validation'
import { createLogger } from '@/lib/utils/logger'
import { captureEvent } from '@/lib/analytics'
import { awardQuest } from '@/lib/actions/quests'
import { normalizePhoneNumber } from '@/lib/utils/phone'
import { decryptPhoneNumber, encryptPhoneNumber } from '@/lib/utils/phone-encryption'
import type {
  SaveProfileResult,
  SetPublishedResult,
} from '@/lib/actions/profile.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
// Pure helpers live in a non-server file so Next.js 'use server' constraint
// (all exports must be async) does not apply to them.
import {
  parseSkillArray as _parseSkillArray,
  coerceFormDataToProfileInput as _coerceFormDataToProfileInput,
} from '@/lib/actions/profile-helpers'

// ---------- Re-export pure helpers (exported for unit testing) ----------
// Wrapped as async so this 'use server' file can legally export them.
// Tests import from this file; wrapping preserves the import path.
export async function parseSkillArray(raw: FormDataEntryValue | null | undefined): Promise<string[]> {
  return _parseSkillArray(raw)
}

export async function coerceFormDataToProfileInput(formData: FormData): Promise<{
  displayName: string
  bio: string
  avatarUrl: string
  skillsOffered: string[]
  skillsWanted: string[]
  countyId: number | null
  categoryId: number | null
  availability: string
  acceptingContact: boolean
  tiktokHandle: string
  phoneNumber: string
  emailDigestEnabled: boolean
}> {
  return _coerceFormDataToProfileInput(formData)
}

// ---------- Slug resolver (RESEARCH Pitfall 5) ----------

export async function resolveUniqueSlug(
  supabase: SupabaseClient<Database>,
  base: string,
  excludeProfileId?: string,
): Promise<string> {
  if (!base) base = 'member'
  const candidates: string[] = [
    base,
    ...Array.from({ length: 8 }, (_, i) => `${base}-${i + 2}`),
    `${base}-${crypto.randomUUID().slice(0, 8)}`,
  ]
  for (const candidate of candidates) {
    let query = supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('username', candidate)
    if (excludeProfileId) query = query.neq('id', excludeProfileId)
    const { count, error } = await query
    if (error) {
      const log = createLogger('profile')
      log.error('resolveUniqueSlug select failed', { error, context: { code: error.code } })
      // Fall through to next candidate; if all fail, the last (uuid-suffixed) candidate wins via insert attempt
      continue
    }
    if (count === 0) return candidate
  }
  return candidates[candidates.length - 1]
}

// ---------- saveProfile (PROF-01..PROF-11, D-07, D-08) ----------

export async function saveProfile(
  _prev: SaveProfileResult | null,
  formData: FormData,
): Promise<SaveProfileResult> {
  const supabase = await createClient()
  // Pitfall 4: getUser() for DML identity — not getSession()/getClaims().
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, error: 'Not authenticated.' }

  const input = _coerceFormDataToProfileInput(formData)
  const parsed = validateAndSanitize(ProfileFormSchema, input)
  if (!parsed.ok) {
    // Never log field values (PII). Return flattened errors to UI.
    const log = createLogger('profile')
    log.warn('validation failed', { context: { issues: Object.keys(parsed.fieldErrors ?? {}) } })
    return {
      ok: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    }
  }
  const values = parsed.data

  // Fetch existing to determine slug lock (D-08) and profile id
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('id, username, phone_number, phone_verified')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (fetchError) {
    const log = createLogger('profile')
    log.error('fetch existing failed', { error: fetchError, context: { code: fetchError.code } })
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }

  const normalizedPhoneNumber = values.phoneNumber ? normalizePhoneNumber(values.phoneNumber) : null
  const existingPhoneNumber = existing?.phone_number
    ? (() => {
        try {
          return normalizePhoneNumber(decryptPhoneNumber(existing.phone_number))
        } catch {
          return null
        }
      })()
    : null
  const phoneNumberChanged = normalizedPhoneNumber !== existingPhoneNumber

  // D-07 + D-08: generate slug only on first save (when existing.username is null/unset)
  let finalSlug = existing?.username ?? null
  if (!finalSlug && values.displayName) {
    const base = generateSlug(values.displayName) || 'member'
    finalSlug = await resolveUniqueSlug(supabase, base)
  }

  // Upsert profile row (owner_id is unique — one profile per user)
  const profileRow = {
    owner_id: user.id,
    username: finalSlug,
    display_name: values.displayName,
    bio: values.bio || null,
    avatar_url: values.avatarUrl || null,
    county_id: values.countyId,
    category_id: values.categoryId,
    availability: values.availability || null,
    accepting_contact: values.acceptingContact,
    tiktok_handle: values.tiktokHandle || null,
    phone_number: normalizedPhoneNumber ? encryptPhoneNumber(normalizedPhoneNumber) : null,
    phone_verified: phoneNumberChanged ? false : (existing?.phone_verified ?? false),
    email_digest_enabled: values.emailDigestEnabled,
  }
  const { data: upserted, error: upsertError } = await supabase
    .from('profiles')
    .upsert(profileRow, { onConflict: 'owner_id' })
    .select('id, username')
    .single()
  if (upsertError) {
    // 23505 unique_violation on username — retry slug resolution once
    if (upsertError.code === '23505' && !existing?.username) {
      const base = generateSlug(values.displayName) || 'member'
      const retrySlug = `${base}-${crypto.randomUUID().slice(0, 8)}`
      const { data: retryRow, error: retryError } = await supabase
        .from('profiles')
        .upsert({ ...profileRow, username: retrySlug }, { onConflict: 'owner_id' })
        .select('id, username')
        .single()
      if (retryError || !retryRow) {
        const log = createLogger('profile')
        log.error('retry after 23505 failed', { error: retryError, context: { code: retryError?.code } })
        return { ok: false, error: 'Something went wrong. Please try again.' }
      }
      finalSlug = retryRow.username
    } else {
      const log = createLogger('profile')
      log.error('upsert failed', { error: upsertError, context: { code: upsertError.code } })
      return { ok: false, error: 'Something went wrong. Please try again.' }
    }
  }
  const profileId =
    upserted?.id ??
    (await supabase.from('profiles').select('id').eq('owner_id', user.id).single()).data?.id
  if (!profileId) return { ok: false, error: 'Something went wrong. Please try again.' }

  // Replace skills_offered and skills_wanted rows (delete+insert; bounded to <=5 each, no FK cascade issues)
  await supabase.from('skills_offered').delete().eq('profile_id', profileId)
  if (values.skillsOffered.length) {
    const rows = values.skillsOffered.map((skill_text, sort_order) => ({
      profile_id: profileId,
      skill_text,
      sort_order,
    }))
    const { error } = await supabase.from('skills_offered').insert(rows)
    if (error) {
      const log = createLogger('profile')
      log.error('skills_offered insert failed', { error, context: { code: error.code } })
      return { ok: false, error: 'Something went wrong saving your skills. Please try again.' }
    }
  }
  await supabase.from('skills_wanted').delete().eq('profile_id', profileId)
  if (values.skillsWanted.length) {
    const rows = values.skillsWanted.map((skill_text, sort_order) => ({
      profile_id: profileId,
      skill_text,
      sort_order,
    }))
    const { error } = await supabase.from('skills_wanted').insert(rows)
    if (error) {
      const log = createLogger('profile')
      log.error('skills_wanted insert failed', { error, context: { code: error.code } })
      return { ok: false, error: 'Something went wrong saving your skills. Please try again.' }
    }
  }

  return { ok: true, slug: finalSlug ?? undefined }
}

// ---------- setPublished (PROF-12 server-side gate) ----------

const SetPublishedSchema = z.object({
  profileId: z.string().uuid(),
  publish: z.enum(['true', 'false']),
})

export async function setPublished(
  _prev: SetPublishedResult | null,
  formData: FormData,
): Promise<SetPublishedResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, error: 'Not authenticated.' }

  const parsed = SetPublishedSchema.safeParse({
    profileId: formData.get('profileId'),
    publish: formData.get('publish'),
  })
  if (!parsed.success) return { ok: false, error: 'Invalid request.' }
  const { profileId, publish } = parsed.data
  const shouldPublish = publish === 'true'

  // If unpublishing, RLS allows it directly.
  if (!shouldPublish) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_published: false })
      .eq('id', profileId)
      .eq('owner_id', user.id)
    if (error) {
      const log = createLogger('profile')
      log.error('unpublish failed', { error, context: { code: error.code } })
      return { ok: false, error: 'Something went wrong. Please try again.' }
    }
    return { ok: true }
  }

  // Publishing: re-verify completeness server-side (double gate with RLS WITH CHECK).
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, county_id, category_id, skills_offered(id)')
    .eq('id', profileId)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (fetchError || !profile) {
    const log = createLogger('profile')
    log.error('setPublished fetch failed', { error: fetchError, context: { code: fetchError?.code } })
    return { ok: false, error: 'Profile not found.' }
  }

  const missingFields: SetPublishedResult['missingFields'] = []
  if (!profile.display_name) missingFields!.push('displayName')
  if (!profile.avatar_url) missingFields!.push('avatarUrl')
  if (!profile.county_id) missingFields!.push('countyId')
  if (!profile.category_id) missingFields!.push('categoryId')
  if (!Array.isArray(profile.skills_offered) || profile.skills_offered.length < 1)
    missingFields!.push('skillsOffered')

  if (missingFields!.length > 0) {
    return {
      ok: false,
      error: 'Your profile needs a few more details before you can publish.',
      missingFields,
    }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ is_published: true })
    .eq('id', profileId)
    .eq('owner_id', user.id)
  if (updateError) {
    const log = createLogger('profile')
    log.error('publish update failed', { error: updateError, context: { code: updateError.code } })
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }

  void captureEvent(user.id, 'profile_published', {
    method: 'toggle',
    profile_id: profileId,
  })

  try {
    const { data: awardedReferral, error: referralError } = await supabase.rpc('award_referral_credits', {
      p_invitee_id: profileId,
    })

    if (referralError) {
      throw referralError
    }

    if (awardedReferral) {
      const { data: referral } = await supabase
        .from('referrals')
        .select('id, inviter_id')
        .eq('invitee_id', profileId)
        .maybeSingle()

      if (referral?.inviter_id) {
        void captureEvent(referral.inviter_id, 'referral_converted', {
          referral_id: referral.id,
          invitee_profile_id: profileId,
          credits: 10,
        })
      }
    }
  } catch (err) {
    const log = createLogger('profile')
    log.warn('referral conversion award failed', {
      context: { profileId, error: err instanceof Error ? err.message : String(err) },
    })
  }

  const questResult = await awardQuest('quest_complete_profile')
  if (!questResult.ok) {
    const log = createLogger('profile')
    log.warn('quest_complete_profile award failed', {
      context: { profileId, error: questResult.error },
    })
  }

  return { ok: true }
}
