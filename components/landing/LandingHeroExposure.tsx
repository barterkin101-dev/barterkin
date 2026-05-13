'use client'

import { useEffect } from 'react'

import { captureClientEvent } from '@/lib/analytics-client'
import {
  LANDING_HERO_EXPERIMENT,
  LANDING_HERO_FLAG_KEY,
  type LandingHeroVariant,
} from '@/lib/ab-testing-shared'

export function LandingHeroExposure({ variant }: { variant: LandingHeroVariant }) {
  useEffect(() => {
    captureClientEvent('landing_hero_variant_viewed', {
      landing_experiment: LANDING_HERO_EXPERIMENT,
      landing_hero_variant: variant,
      landing_hero_flag_key: LANDING_HERO_FLAG_KEY,
    })
  }, [variant])

  return null
}
