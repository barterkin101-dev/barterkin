'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ProfileFormSchema } from '@/lib/schemas/profile'
import { generateSlug } from '@/lib/utils/slug'
import type {
  SaveProfileResult,
  SetPublishedResult,
} from '@/lib/actions/profile.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// ---------- Pure helpers (exported for unit testing) ----------

export function parseSkillArray(raw: FormDataEntryValue | null | undefined): string[] {
  if (raw == null || typeof raw !== 'string') return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 5) // PROF-03/PROF-04 cap
  } catch {
    return []
  }
}

export function coerceFormDataToProfileInput(formData: FormData): {
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
} {
  const intOrNull = (v: FormDataEntryValue | null) => {
    const s = typeof v === 'string' ? v.trim() : ''
    if (s === '') return null
    const n = Number.parseInt(s, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return {
    displayName: String(formData.get('displayName') ?? '').trim(),
    bio: String(formData.get('bio') ?? ''),
    avatarUrl: String(formData.get('avatarUrl') ?? ''),
    skillsOffered: parseSkillArray(formData.get('skillsOffered')),
    skillsWanted: parseSkillArray(formData.get('skillsWanted')),
    countyId: intOrNull(formData.get('countyId')),
    categoryId: intOrNull(formData.get('categoryId')),
    availability: String(formData.get('availability') ?? ''),
    acceptingContact: formData.get('acceptingContact') === 'true',
    tiktokHandle: String(formData.get('tiktokHandle') ?? ''),
  }
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
      console.error('[resolveUniqueSlug] select failed', { code: error.code })
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

  const input = coerceFormDataToProfileInput(formData)
  const parsed = ProfileFormSchema.safeParse(input)
  if (!parsed.success) {
    // Never log field values (PII). Return flattened errors to UI.
    console.error('[saveProfile] zod validation failed', { issues: parsed.error.issues.length })
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }
  const values = parsed.data

  // Fetch existing to determine slug lock (D-08) and profile id
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (fetchError) {
    console.error('[saveProfile] fetch existing failed', { code: fetchError.code })
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }

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
        console.error('[saveProfile] retry after 23505 failed', { code: retryError?.code })
        return { ok: false, error: 'Something went wrong. Please try again.' }
      }
      finalSlug = retryRow.username
    } else {
      console.error('[saveProfile] upsert failed', { code: upsertError.code })
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
      console.error('[saveProfile] skills_offered insert failed', { code: error.code })
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
      console.error('[saveProfile] skills_wanted insert failed', { code: error.code })
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
      console.error('[setPublished] unpublish failed', { code: error.code })
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
    console.error('[setPublished] fetch failed', { code: fetchError?.code })
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
    console.error('[setPublished] publish update failed', { code: updateError.code })
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
  return { ok: true }
}
