import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

export interface ProfileViewsSnapshot {
  currentViews: number
  previousViews: number
  delta: number
  trend: 'empty' | 'up' | 'down' | 'flat'
}

export function buildProfileViewsSnapshot(
  rows: Array<{ created_at: string }>,
  now = new Date(),
): ProfileViewsSnapshot {
  const nowMs = now.getTime()
  const currentCutoff = nowMs - SEVEN_DAYS_MS
  const previousCutoff = nowMs - FOURTEEN_DAYS_MS

  let currentViews = 0
  let previousViews = 0

  for (const row of rows) {
    const createdAtMs = new Date(row.created_at).getTime()
    if (Number.isNaN(createdAtMs) || createdAtMs < previousCutoff || createdAtMs > nowMs) {
      continue
    }

    if (createdAtMs >= currentCutoff) {
      currentViews += 1
    } else {
      previousViews += 1
    }
  }

  const delta = currentViews - previousViews
  const trend =
    currentViews === 0 && previousViews === 0
      ? 'empty'
      : delta > 0
        ? 'up'
        : delta < 0
          ? 'down'
          : 'flat'

  return {
    currentViews,
    previousViews,
    delta,
    trend,
  }
}

export async function getProfileViewsSnapshot(
  profileId: string,
  now = new Date(),
): Promise<ProfileViewsSnapshot> {
  const supabase = await createClient()
  const sinceIso = new Date(now.getTime() - FOURTEEN_DAYS_MS).toISOString()

  const { data, error } = await supabase
    .from('profile_views')
    .select('created_at')
    .eq('viewed_profile_id', profileId)
    .gte('created_at', sinceIso)

  if (error) {
    createLogger('profile-views').error('profile views snapshot error', {
      context: { code: error.code, profileId },
    })
    return buildProfileViewsSnapshot([], now)
  }

  return buildProfileViewsSnapshot(data ?? [], now)
}
