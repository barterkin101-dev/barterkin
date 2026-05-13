import 'server-only'

import crypto from 'node:crypto'

import { headers } from 'next/headers'
import { PostHog } from 'posthog-node'

import {
  LANDING_HERO_FLAG_KEY,
  LANDING_HERO_VARIANTS,
  normalizeLandingHeroVariant,
  type LandingHeroVariant,
} from '@/lib/ab-testing-shared'
import { createLogger } from '@/lib/utils/logger'

export interface LandingHeroVariantAssignment {
  distinctId: string
  variant: LandingHeroVariant
  source: 'posthog' | 'fallback'
}

export function pickLandingHeroVariantFromSeed(seed: string): LandingHeroVariant {
  const hash = crypto.createHash('sha256').update(seed).digest()
  return hash[0] % 2 === 0
    ? LANDING_HERO_VARIANTS.control
    : LANDING_HERO_VARIANTS.challenger
}

function getPostHog(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null

  return new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  })
}

function getLandingHeroDistinctId(seed: string): string {
  const digest = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32)
  return `landing:${digest}`
}

export async function getLandingHeroVariantAssignment(): Promise<LandingHeroVariantAssignment> {
  const hdrs = await headers()
  const ip = (hdrs.get('x-forwarded-for') ?? '').split(',')[0]?.trim() ?? ''
  const userAgent = hdrs.get('user-agent') ?? 'unknown'
  const language = hdrs.get('accept-language') ?? 'unknown'
  const seed = `${ip}|${userAgent}|${language}`
  const distinctId = getLandingHeroDistinctId(seed)
  const fallbackVariant = pickLandingHeroVariantFromSeed(seed)

  const posthog = getPostHog()
  if (!posthog) {
    return { distinctId, variant: fallbackVariant, source: 'fallback' }
  }

  try {
    const flagValue = await posthog.getFeatureFlag(
      LANDING_HERO_FLAG_KEY,
      distinctId,
      { sendFeatureFlagEvents: true },
    )
    const variant = normalizeLandingHeroVariant(
      typeof flagValue === 'string' ? flagValue : null,
    )

    return {
      distinctId,
      variant: variant ?? fallbackVariant,
      source: variant ? 'posthog' : 'fallback',
    }
  } catch (error) {
    const log = createLogger('ab-testing')
    log.warn('landing hero feature flag lookup failed', { error })
    return { distinctId, variant: fallbackVariant, source: 'fallback' }
  } finally {
    await posthog.shutdown().catch(() => {})
  }
}
