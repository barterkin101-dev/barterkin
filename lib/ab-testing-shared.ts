export const LANDING_HERO_EXPERIMENT = 'landing_hero_copy'
export const LANDING_HERO_FLAG_KEY = 'landing-hero-copy'

export const LANDING_HERO_VARIANTS = {
  control: 'georgia_community_skills_exchange',
  challenger: 'trade_skills_neighbors_no_cash',
} as const

export type LandingHeroVariant =
  (typeof LANDING_HERO_VARIANTS)[keyof typeof LANDING_HERO_VARIANTS]

export function normalizeLandingHeroVariant(
  value: string | null | undefined,
): LandingHeroVariant | null {
  if (!value) return null

  const normalized = value.trim().toLowerCase()

  if (
    normalized === LANDING_HERO_VARIANTS.control ||
    normalized === 'control' ||
    normalized === 'georgia'
  ) {
    return LANDING_HERO_VARIANTS.control
  }

  if (
    normalized === LANDING_HERO_VARIANTS.challenger ||
    normalized === 'challenger' ||
    normalized === 'neighbors_no_cash'
  ) {
    return LANDING_HERO_VARIANTS.challenger
  }

  return null
}

export function getLandingHeroExperimentProperties(
  value: string | null | undefined,
): Record<string, string> {
  const variant = normalizeLandingHeroVariant(value)
  if (!variant) return {}

  return {
    landing_experiment: LANDING_HERO_EXPERIMENT,
    landing_hero_variant: variant,
    landing_hero_flag_key: LANDING_HERO_FLAG_KEY,
  }
}
