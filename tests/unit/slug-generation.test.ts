import { describe, it, expect } from 'vitest'
import { generateSlug } from '@/lib/utils/slug'

// D-07: lowercase -> replace non-alphanumeric runs with '-' -> strip leading/trailing '-' -> truncate to 40
describe('generateSlug (D-07)', () => {
  it("generateSlug('Kerry Smith') === 'kerry-smith'", () => {
    expect(generateSlug('Kerry Smith')).toBe('kerry-smith')
  })

  it("generateSlug('KERRY SMITH') === 'kerry-smith'", () => {
    expect(generateSlug('KERRY SMITH')).toBe('kerry-smith')
  })

  it("collapses inner + outer whitespace: '  Kerry   Smith  '", () => {
    expect(generateSlug('  Kerry   Smith  ')).toBe('kerry-smith')
  })

  it("generateSlug(\"O'Malley\") === 'o-malley'", () => {
    expect(generateSlug("O'Malley")).toBe('o-malley')
  })

  it("strips accented chars: 'café au lait' → 'caf-au-lait'", () => {
    expect(generateSlug('café au lait')).toBe('caf-au-lait')
  })

  it("strips leading/trailing hyphens: '-Kerry-' → 'kerry'", () => {
    expect(generateSlug('-Kerry-')).toBe('kerry')
  })

  it('truncates to 40 characters', () => {
    expect(generateSlug('a'.repeat(50))).toHaveLength(40)
  })

  it("numeric-only names: '123 456' → '123-456'", () => {
    expect(generateSlug('123 456')).toBe('123-456')
  })

  it("empty input returns empty string (caller guards)", () => {
    expect(generateSlug('')).toBe('')
  })
})
