import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { Hero } from '../Hero'
import * as analytics from '@/lib/analytics'

describe('Hero', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fires landing_hero_variant_viewed on mount', () => {
    const captureSpy = vi.spyOn(analytics, 'captureLandingEvent').mockImplementation(() => {})
    vi.spyOn(analytics, 'getHeroVariant').mockReturnValue('control')

    render(<Hero />)

    expect(captureSpy).toHaveBeenCalledWith('landing_hero_variant_viewed', { variant: 'control' })
  })

  it('fires landing_hero_variant_viewed with url variant on mount', () => {
    window.history.replaceState({}, '', '/?v=variant_b')
    const captureSpy = vi.spyOn(analytics, 'captureLandingEvent').mockImplementation(() => {})
    vi.spyOn(analytics, 'getHeroVariant').mockReturnValue('variant_b')

    render(<Hero />)

    expect(captureSpy).toHaveBeenCalledWith('landing_hero_variant_viewed', { variant: 'variant_b' })
    window.history.replaceState({}, '', '/')
  })
})
