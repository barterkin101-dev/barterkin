import { beforeEach, describe, expect, it, vi } from 'vitest'
// Pure helpers live in profile-helpers.ts (not 'use server') so they can be sync-tested.
// profile.ts re-exports them as async wrappers to satisfy Next.js 'use server' constraint.
import { parseSkillArray, coerceFormDataToProfileInput } from '@/lib/actions/profile-helpers'
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { captureEvent } from '@/lib/analytics'
import { revalidatePath } from 'next/cache'
import { enableWeeklyDigestFromDashboard, saveProfile } from '@/lib/actions/profile'

function buildProfileFormData(overrides?: { emailDigestEnabled?: 'true' | 'false' | null }) {
  const fd = new FormData()
  fd.set('displayName', 'Kerry Smith')
  fd.set('bio', 'Georgia barter neighbor')
  fd.set('avatarUrl', 'https://example.com/avatar.webp')
  fd.set('skillsOffered', JSON.stringify([]))
  fd.set('skillsWanted', JSON.stringify([]))
  fd.set('countyId', '121')
  fd.set('categoryId', '2')
  fd.set('availability', 'Weekends')
  fd.set('acceptingContact', 'true')
  fd.set('tiktokHandle', '@kerry.smith')
  fd.set('phoneNumber', '')
  if (overrides?.emailDigestEnabled !== null) {
    fd.set('emailDigestEnabled', overrides?.emailDigestEnabled ?? 'true')
  }
  return fd
}

function makeSaveProfileSupabaseMock() {
  const getUserMock = vi.fn().mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  })
  const existingProfileMaybeSingleMock = vi.fn().mockResolvedValue({
    data: {
      id: 'profile-1',
      username: 'kerry-smith',
      phone_number: null,
      phone_verified: false,
    },
    error: null,
  })
  const existingProfileEqMock = vi.fn().mockReturnValue({ maybeSingle: existingProfileMaybeSingleMock })
  const existingProfileSelectMock = vi.fn().mockReturnValue({ eq: existingProfileEqMock })

  const upsertSingleMock = vi.fn().mockResolvedValue({
    data: { id: 'profile-1', username: 'kerry-smith' },
    error: null,
  })
  const upsertSelectMock = vi.fn().mockReturnValue({ single: upsertSingleMock })
  const upsertMock = vi.fn().mockReturnValue({ select: upsertSelectMock })

  const deleteSkillsOfferedEqMock = vi.fn().mockResolvedValue({ error: null })
  const deleteSkillsOfferedMock = vi.fn().mockReturnValue({ eq: deleteSkillsOfferedEqMock })
  const deleteSkillsWantedEqMock = vi.fn().mockResolvedValue({ error: null })
  const deleteSkillsWantedMock = vi.fn().mockReturnValue({ eq: deleteSkillsWantedEqMock })

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: existingProfileSelectMock,
        upsert: upsertMock,
      }
    }
    if (table === 'skills_offered') {
      return {
        delete: deleteSkillsOfferedMock,
      }
    }
    if (table === 'skills_wanted') {
      return {
        delete: deleteSkillsWantedMock,
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })

  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: getUserMock },
    from: fromMock,
  } as never)

  return { upsertMock }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('parseSkillArray (PROF-03, PROF-04)', () => {
  it('parses a JSON array of strings', () => {
    expect(parseSkillArray(JSON.stringify(['a', 'b']))).toEqual(['a', 'b'])
  })
  it('filters empty/whitespace-only strings', () => {
    expect(parseSkillArray(JSON.stringify(['a', '', '  ', 'b']))).toEqual(['a', 'b'])
  })
  it('returns [] on invalid JSON', () => {
    expect(parseSkillArray('not json')).toEqual([])
  })
  it('returns [] on null/undefined input', () => {
    expect(parseSkillArray(null)).toEqual([])
    expect(parseSkillArray(undefined)).toEqual([])
  })
  it('caps at 5 entries (silently drops 6+)', () => {
    expect(parseSkillArray(JSON.stringify(['1', '2', '3', '4', '5', '6']))).toHaveLength(5)
  })
})

describe('coerceFormDataToProfileInput (Zod-ready shape)', () => {
  it('coerces numeric string countyId to number', () => {
    const fd = new FormData()
    fd.set('displayName', 'Kerry')
    fd.set('countyId', '13001')
    fd.set('categoryId', '5')
    fd.set('skillsOffered', JSON.stringify(['a']))
    fd.set('skillsWanted', JSON.stringify([]))
    fd.set('acceptingContact', 'true')
    fd.set('phoneNumber', '(404) 555-0123')
    const out = coerceFormDataToProfileInput(fd)
    expect(out.countyId).toBe(13001)
    expect(out.categoryId).toBe(5)
    expect(out.acceptingContact).toBe(true)
    expect(out.skillsOffered).toEqual(['a'])
    expect(out.skillsWanted).toEqual([])
    expect(out.phoneNumber).toBe('(404) 555-0123')
    expect(out.emailDigestEnabled).toBe(true)
  })
  it('coerces empty countyId to null', () => {
    const fd = new FormData()
    fd.set('displayName', 'Kerry')
    fd.set('countyId', '')
    fd.set('categoryId', '')
    fd.set('skillsOffered', JSON.stringify([]))
    fd.set('skillsWanted', JSON.stringify([]))
    fd.set('acceptingContact', 'false')
    const out = coerceFormDataToProfileInput(fd)
    expect(out.countyId).toBeNull()
    expect(out.categoryId).toBeNull()
    expect(out.acceptingContact).toBe(false)
  })

  it('defaults emailDigestEnabled to true when omitted from the form payload', () => {
    const fd = new FormData()
    fd.set('displayName', 'Kerry')
    fd.set('countyId', '')
    fd.set('categoryId', '')
    fd.set('skillsOffered', JSON.stringify([]))
    fd.set('skillsWanted', JSON.stringify([]))
    fd.set('acceptingContact', 'false')
    const out = coerceFormDataToProfileInput(fd)
    expect(out.emailDigestEnabled).toBe(true)
  })

  it('coerces emailDigestEnabled false from FormData', () => {
    const fd = new FormData()
    fd.set('displayName', 'Kerry')
    fd.set('countyId', '')
    fd.set('categoryId', '')
    fd.set('skillsOffered', JSON.stringify([]))
    fd.set('skillsWanted', JSON.stringify([]))
    fd.set('acceptingContact', 'false')
    fd.set('emailDigestEnabled', 'false')
    const out = coerceFormDataToProfileInput(fd)
    expect(out.emailDigestEnabled).toBe(false)
  })
})

describe('saveProfile', () => {
  it('persists email_digest_enabled false when a member opts out', async () => {
    const { upsertMock } = makeSaveProfileSupabaseMock()

    const result = await saveProfile(null, buildProfileFormData({ emailDigestEnabled: 'false' }))

    expect(result).toEqual({ ok: true, slug: 'kerry-smith' })
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: 'user-1',
        email_digest_enabled: false,
      }),
      { onConflict: 'owner_id' },
    )
  })

  it('keeps email_digest_enabled true when the digest field is omitted', async () => {
    const { upsertMock } = makeSaveProfileSupabaseMock()

    const result = await saveProfile(null, buildProfileFormData({ emailDigestEnabled: null }))

    expect(result).toEqual({ ok: true, slug: 'kerry-smith' })
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: 'user-1',
        email_digest_enabled: true,
      }),
      { onConflict: 'owner_id' },
    )
  })
})

describe('enableWeeklyDigestFromDashboard', () => {
  it('turns the digest back on, revalidates, and tracks the restore event', async () => {
    const getUserMock = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: { id: 'profile-1', email_digest_enabled: false },
      error: null,
    })
    const eqOwnerMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqOwnerMock })
    const eqUpdateOwnerMock = vi.fn().mockResolvedValue({ error: null })
    const eqUpdateIdMock = vi.fn().mockReturnValue({ eq: eqUpdateOwnerMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqUpdateIdMock })
    const fromMock = vi.fn().mockImplementation(() => ({
      select: selectMock,
      update: updateMock,
    }))

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: getUserMock },
      from: fromMock,
    } as never)

    const result = await enableWeeklyDigestFromDashboard(null, new FormData())

    expect(result).toEqual({ ok: true })
    expect(updateMock).toHaveBeenCalledWith({ email_digest_enabled: true })
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith(
      'user-1',
      'weekly_digest_reenabled',
      { source: 'dashboard_reminder' },
    )
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/dashboard')
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/profile/edit')
  })

  it('returns success without writing when the digest is already enabled', async () => {
    const getUserMock = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: { id: 'profile-1', email_digest_enabled: true },
      error: null,
    })
    const eqOwnerMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqOwnerMock })
    const updateMock = vi.fn()
    const fromMock = vi.fn().mockImplementation(() => ({
      select: selectMock,
      update: updateMock,
    }))

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: getUserMock },
      from: fromMock,
    } as never)

    const result = await enableWeeklyDigestFromDashboard(null, new FormData())

    expect(result).toEqual({ ok: true })
    expect(updateMock).not.toHaveBeenCalled()
    expect(vi.mocked(captureEvent)).not.toHaveBeenCalled()
  })
})
