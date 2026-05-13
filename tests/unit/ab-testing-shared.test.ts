import { describe, expect, it } from 'vitest'

import {
  LANDING_HERO_VARIANTS,
  getLandingHeroExperimentProperties,
  normalizeLandingHeroVariant,
} from '@/lib/ab-testing-shared'

describe('ab-testing-shared', () => {
  it('normalizes supported landing hero variants', () => {
    expect(normalizeLandingHeroVariant('control')).toBe(LANDING_HERO_VARIANTS.control)
    expect(normalizeLandingHeroVariant('neighbors_no_cash')).toBe(LANDING_HERO_VARIANTS.challenger)
    expect(normalizeLandingHeroVariant('trade_skills_neighbors_no_cash')).toBe(
      LANDING_HERO_VARIANTS.challenger,
    )
  })

  it('returns analytics properties only for recognized variants', () => {
    expect(getLandingHeroExperimentProperties(LANDING_HERO_VARIANTS.control)).toEqual({
      landing_experiment: 'landing_hero_copy',
      landing_hero_variant: LANDING_HERO_VARIANTS.control,
      landing_hero_flag_key: 'landing-hero-copy',
    })
    expect(getLandingHeroExperimentProperties('unknown')).toEqual({})
  })
})
