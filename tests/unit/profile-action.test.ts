import { describe, it, expect } from 'vitest'
// These two pure helpers must be exported from lib/actions/profile.ts:
import { parseSkillArray, coerceFormDataToProfileInput } from '@/lib/actions/profile'

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
    const out = coerceFormDataToProfileInput(fd)
    expect(out.countyId).toBe(13001)
    expect(out.categoryId).toBe(5)
    expect(out.acceptingContact).toBe(true)
    expect(out.skillsOffered).toEqual(['a'])
    expect(out.skillsWanted).toEqual([])
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
})
