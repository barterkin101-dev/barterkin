/**
 * Phase 4 — DIR-05, DIR-06 — parseSearchParams unit tests
 */
import { describe, expect, it } from 'vitest'
import {
  MAX_Q_LENGTH,
  MIN_Q_LENGTH,
  parseSearchParams,
} from '@/lib/data/directory-params'

describe('parseSearchParams — category', () => {
  it('valid category slug maps to category + id', () => {
    const f = parseSearchParams({ category: 'arts-crafts' })
    expect(f.categorySlug).toBe('arts-crafts')
    expect(f.categoryId).toBe(3)
    expect(f.activeFilterCount).toBe(1)
  })
  it('invalid category slug returns null', () => {
    const f = parseSearchParams({ category: 'not-a-real-slug' })
    expect(f.categorySlug).toBeNull()
    expect(f.categoryId).toBeNull()
    expect(f.activeFilterCount).toBe(0)
  })
  it('array value takes first element', () => {
    const f = parseSearchParams({ category: ['arts-crafts', 'tech-digital'] })
    expect(f.categorySlug).toBe('arts-crafts')
  })
})

describe('parseSearchParams — county', () => {
  it('valid county fips maps to county name + id', () => {
    const f = parseSearchParams({ county: '13001' })
    expect(f.countyFips).toBe(13001)
    expect(f.countyId).toBe(13001)
    expect(f.countyName).toBe('Appling County')
  })
  it('invalid county fips returns null', () => {
    const f = parseSearchParams({ county: '99999' })
    expect(f.countyFips).toBeNull()
    expect(f.countyName).toBeNull()
  })
  it('non-numeric county returns null', () => {
    const f = parseSearchParams({ county: 'fulton' })
    expect(f.countyFips).toBeNull()
  })
})

describe('parseSearchParams — q (keyword)', () => {
  it('length 0 → null', () => {
    expect(parseSearchParams({ q: '' }).q).toBeNull()
  })
  it('length 1 → null (below MIN_Q_LENGTH)', () => {
    expect(parseSearchParams({ q: 'a' }).q).toBeNull()
  })
  it('length 2 → preserved', () => {
    expect(parseSearchParams({ q: 'ab' }).q).toBe('ab')
  })
  it('length 100 → preserved', () => {
    const q = 'x'.repeat(100)
    expect(parseSearchParams({ q }).q).toBe(q)
  })
  it('length 101 → truncated to 100', () => {
    const q = 'x'.repeat(101)
    const result = parseSearchParams({ q }).q
    expect(result).not.toBeNull()
    expect(result!.length).toBe(100)
  })
  it('surrounding whitespace → trimmed', () => {
    expect(parseSearchParams({ q: '  baking  ' }).q).toBe('baking')
  })
  it('only whitespace → null', () => {
    expect(parseSearchParams({ q: '   ' }).q).toBeNull()
  })
})

describe('parseSearchParams — page', () => {
  it('missing → 1', () => {
    expect(parseSearchParams({}).page).toBe(1)
  })
  it('garbage → 1', () => {
    expect(parseSearchParams({ page: 'garbage' }).page).toBe(1)
  })
  it('0 → 1', () => {
    expect(parseSearchParams({ page: '0' }).page).toBe(1)
  })
  it('-5 → 1', () => {
    expect(parseSearchParams({ page: '-5' }).page).toBe(1)
  })
  it('3 → 3', () => {
    expect(parseSearchParams({ page: '3' }).page).toBe(3)
  })
})

describe('parseSearchParams — activeFilterCount', () => {
  it('0 when all filters absent', () => {
    expect(parseSearchParams({}).activeFilterCount).toBe(0)
  })
  it('1 when only category present', () => {
    expect(parseSearchParams({ category: 'arts-crafts' }).activeFilterCount).toBe(1)
  })
  it('3 when category + county + q all valid', () => {
    const f = parseSearchParams({
      category: 'arts-crafts',
      county: '13001',
      q: 'baking',
    })
    expect(f.activeFilterCount).toBe(3)
  })
})

describe('parseSearchParams — combined', () => {
  it('valid category + invalid county → category kept, county null', () => {
    const f = parseSearchParams({
      category: 'arts-crafts',
      county: 'bogus',
    })
    expect(f.categorySlug).toBe('arts-crafts')
    expect(f.countyFips).toBeNull()
    expect(f.activeFilterCount).toBe(1)
  })
  it('all three filters valid simultaneously', () => {
    const f = parseSearchParams({
      category: 'tech-digital',
      county: '13121',
      q: 'react',
      page: '2',
    })
    expect(f.categorySlug).toBe('tech-digital')
    expect(f.countyName).not.toBeNull()
    expect(f.q).toBe('react')
    expect(f.page).toBe(2)
    expect(f.activeFilterCount).toBe(3)
  })
})

describe('parseSearchParams — exported constants', () => {
  it('MAX_Q_LENGTH === 100', () => {
    expect(MAX_Q_LENGTH).toBe(100)
  })
  it('MIN_Q_LENGTH === 2', () => {
    expect(MIN_Q_LENGTH).toBe(2)
  })
})
