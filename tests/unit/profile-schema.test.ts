import { describe, it, expect } from 'vitest'
import { ProfileFormSchema, isProfileComplete } from '@/lib/schemas/profile'

// PROF-01, PROF-03, PROF-04, PROF-07, PROF-09
describe('ProfileFormSchema', () => {
  const valid = {
    displayName: 'Kerry Smith',
    bio: 'I love swapping sourdough starters for bluegrass lessons.',
    avatarUrl: 'https://example.com/avatar.webp',
    skillsOffered: ['sourdough baking'],
    skillsWanted: ['fiddle lessons'],
    countyId: 121, // Fulton
    categoryId: 2, // Food & Kitchen
    availability: 'Evenings + weekends',
    acceptingContact: true,
    tiktokHandle: '@kerry.smith',
  }

  it('accepts a valid complete profile object', () => {
    const result = ProfileFormSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects empty displayName (PROF-01 min 1)', () => {
    const result = ProfileFormSchema.safeParse({ ...valid, displayName: '' })
    expect(result.success).toBe(false)
  })

  it('rejects displayName with 61 chars (PROF-01 max 60)', () => {
    const result = ProfileFormSchema.safeParse({ ...valid, displayName: 'a'.repeat(61) })
    expect(result.success).toBe(false)
  })

  it('trims whitespace from displayName', () => {
    const result = ProfileFormSchema.safeParse({ ...valid, displayName: '  Kerry Smith  ' })
    if (result.success) {
      expect(result.data.displayName).toBe('Kerry Smith')
    } else {
      throw new Error('expected parse success')
    }
  })

  it('rejects bio > 500 chars (PROF-01)', () => {
    const result = ProfileFormSchema.safeParse({ ...valid, bio: 'a'.repeat(501) })
    expect(result.success).toBe(false)
  })

  it('accepts empty bio (optional)', () => {
    const result = ProfileFormSchema.safeParse({ ...valid, bio: '' })
    expect(result.success).toBe(true)
  })

  it('rejects skillsOffered with 6 items (PROF-03 max 5)', () => {
    const result = ProfileFormSchema.safeParse({
      ...valid,
      skillsOffered: ['a', 'b', 'c', 'd', 'e', 'f'],
    })
    expect(result.success).toBe(false)
  })

  it('accepts skillsOffered with 1 item', () => {
    const result = ProfileFormSchema.safeParse({ ...valid, skillsOffered: ['woodworking'] })
    expect(result.success).toBe(true)
  })

  it('accepts skillsOffered empty array (schema-level; completeness enforced elsewhere)', () => {
    const result = ProfileFormSchema.safeParse({ ...valid, skillsOffered: [] })
    expect(result.success).toBe(true)
  })

  it('rejects a skill entry of 61 chars (PROF-03 max 60 per entry)', () => {
    const result = ProfileFormSchema.safeParse({
      ...valid,
      skillsOffered: ['a'.repeat(61)],
    })
    expect(result.success).toBe(false)
  })

  it('accepts skillsWanted with 0 items (PROF-04 optional)', () => {
    const result = ProfileFormSchema.safeParse({ ...valid, skillsWanted: [] })
    expect(result.success).toBe(true)
  })

  it('rejects skillsWanted with 6 items (PROF-04 max 5)', () => {
    const result = ProfileFormSchema.safeParse({
      ...valid,
      skillsWanted: ['a', 'b', 'c', 'd', 'e', 'f'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects tiktokHandle without @ prefix (PROF-09)', () => {
    const result = ProfileFormSchema.safeParse({ ...valid, tiktokHandle: 'nohandle' })
    expect(result.success).toBe(false)
  })

  it('accepts tiktokHandle @kerry.smith (PROF-09 dots + underscores)', () => {
    const result = ProfileFormSchema.safeParse({ ...valid, tiktokHandle: '@kerry.smith' })
    expect(result.success).toBe(true)
  })

  it('rejects tiktokHandle with spaces (PROF-09)', () => {
    const result = ProfileFormSchema.safeParse({ ...valid, tiktokHandle: '@kerry smith' })
    expect(result.success).toBe(false)
  })

  it('accepts empty tiktokHandle', () => {
    const result = ProfileFormSchema.safeParse({ ...valid, tiktokHandle: '' })
    expect(result.success).toBe(true)
  })

  it('rejects availability > 200 chars (PROF-07)', () => {
    const result = ProfileFormSchema.safeParse({ ...valid, availability: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })
})

// PROF-12, GEO-01
describe('isProfileComplete', () => {
  const completeInput = {
    displayName: 'Kerry Smith',
    avatarUrl: 'https://example.com/a.webp',
    countyId: 121,
    categoryId: 2,
    skillsOfferedCount: 1,
  }

  it('returns true when all required fields set and skillsOfferedCount>=1', () => {
    expect(isProfileComplete(completeInput)).toBe(true)
  })

  it('returns false when displayName is null', () => {
    expect(isProfileComplete({ ...completeInput, displayName: null })).toBe(false)
  })

  it('returns false when avatarUrl is null', () => {
    expect(isProfileComplete({ ...completeInput, avatarUrl: null })).toBe(false)
  })

  it('returns false when countyId is null', () => {
    expect(isProfileComplete({ ...completeInput, countyId: null })).toBe(false)
  })

  it('returns false when categoryId is null', () => {
    expect(isProfileComplete({ ...completeInput, categoryId: null })).toBe(false)
  })

  it('returns false when skillsOfferedCount is 0', () => {
    expect(isProfileComplete({ ...completeInput, skillsOfferedCount: 0 })).toBe(false)
  })
})
