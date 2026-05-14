import { describe, expect, it } from 'vitest'
import { buildProfileViewsSnapshot } from '@/lib/data/profile-views'

describe('buildProfileViewsSnapshot', () => {
  const now = new Date('2026-05-14T12:00:00.000Z')

  it('returns the empty state when there are no recent views', () => {
    expect(buildProfileViewsSnapshot([], now)).toEqual({
      currentViews: 0,
      previousViews: 0,
      delta: 0,
      trend: 'empty',
    })
  })

  it('marks the trend up when the last 7 days beat the prior 7 days', () => {
    const snapshot = buildProfileViewsSnapshot([
      { created_at: '2026-05-13T09:00:00.000Z' },
      { created_at: '2026-05-12T09:00:00.000Z' },
      { created_at: '2026-05-10T09:00:00.000Z' },
      { created_at: '2026-05-04T09:00:00.000Z' },
    ], now)

    expect(snapshot).toEqual({
      currentViews: 3,
      previousViews: 1,
      delta: 2,
      trend: 'up',
    })
  })

  it('marks the trend down when the prior 7 days beat the last 7 days', () => {
    const snapshot = buildProfileViewsSnapshot([
      { created_at: '2026-05-12T09:00:00.000Z' },
      { created_at: '2026-05-06T09:00:00.000Z' },
      { created_at: '2026-05-05T09:00:00.000Z' },
      { created_at: '2026-05-02T09:00:00.000Z' },
    ], now)

    expect(snapshot).toEqual({
      currentViews: 1,
      previousViews: 3,
      delta: -2,
      trend: 'down',
    })
  })
})
