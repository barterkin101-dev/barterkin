/**
 * Pure helpers shared between the profile server action and unit tests.
 * NOT a server-only file — imported by both lib/actions/profile.ts ('use server')
 * and tests/unit/profile-action.test.ts.
 *
 * Kept separate because Next.js requires all exports from 'use server' files
 * to be async functions. Sync helpers live here so they can be tested directly.
 */

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
