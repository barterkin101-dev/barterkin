import { describe, it, expect } from 'vitest'
import georgiaCounties from '@/lib/data/georgia-counties.json'

type County = { fips: number; name: string }

// GEO-02
describe('Georgia counties static data', () => {
  it('has exactly 159 entries', () => {
    expect((georgiaCounties as County[]).length).toBe(159)
  })

  it('every entry has numeric fips and non-empty string name', () => {
    for (const c of georgiaCounties as County[]) {
      expect(typeof c.fips).toBe('number')
      expect(typeof c.name).toBe('string')
      expect(c.name.length).toBeGreaterThan(0)
    }
  })

  it('FIPS codes are unique', () => {
    const fipsSet = new Set((georgiaCounties as County[]).map(c => c.fips))
    expect(fipsSet.size).toBe((georgiaCounties as County[]).length)
  })

  it('names are unique', () => {
    const nameSet = new Set((georgiaCounties as County[]).map(c => c.name))
    expect(nameSet.size).toBe((georgiaCounties as County[]).length)
  })

  it("contains 'Appling County' (first FIPS 13001), 'Fulton County', and 'Worth County'", () => {
    const names = (georgiaCounties as County[]).map(c => c.name)
    expect(names).toContain('Appling County')
    expect(names).toContain('Fulton County')
    expect(names).toContain('Worth County')
    const appling = (georgiaCounties as County[]).find(c => c.name === 'Appling County')
    expect(appling?.fips).toBe(13001)
  })
})
