import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import posthog from 'posthog-js'

// Mock posthog-js before importing analytics
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
  },
}))

// Import analytics after mock
import { captureLandingEvent, getHeroVariant, setHeroVariant } from '../analytics'

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('captureLandingEvent', () => {
    it('captures event with properties', () => {
      captureLandingEvent('signup_clicked', { location: 'hero_primary' })
      expect(posthog.capture).toHaveBeenCalledWith('signup_clicked', { location: 'hero_primary' })
    })

    it('does not throw when posthog capture throws', () => {
      vi.mocked(posthog.capture).mockImplementation(() => {
        throw new Error('network')
      })
      expect(() => captureLandingEvent('test')).not.toThrow()
    })
  })

  describe('getHeroVariant', () => {
    afterEach(() => {
      window.history.replaceState({}, '', '/')
      localStorage.clear()
    })

    it('returns control by default', () => {
      expect(getHeroVariant()).toBe('control')
    })

    it('reads variant from URL search param', () => {
      window.history.replaceState({}, '', '/?v=variant_b')
      expect(getHeroVariant()).toBe('variant_b')
    })

    it('reads variant from localStorage when no URL param', () => {
      localStorage.setItem('barterkin_hero_variant', 'variant_a')
      expect(getHeroVariant()).toBe('variant_a')
    })

    it('prefers URL param over localStorage', () => {
      localStorage.setItem('barterkin_hero_variant', 'variant_a')
      window.history.replaceState({}, '', '/?v=variant_b')
      expect(getHeroVariant()).toBe('variant_b')
    })
  })

  describe('setHeroVariant', () => {
    afterEach(() => {
      localStorage.clear()
    })

    it('persists variant to localStorage', () => {
      setHeroVariant('variant_c')
      expect(localStorage.getItem('barterkin_hero_variant')).toBe('variant_c')
    })

    it('does not throw when localStorage is unavailable', () => {
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('quota exceeded')
      })
      expect(() => setHeroVariant('variant_d')).not.toThrow()
      Storage.prototype.setItem = originalSetItem
    })
  })
})
