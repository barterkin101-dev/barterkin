import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'

export interface SiteUpdateRow {
  id: string
  title: string
  body: string
  category: 'feature' | 'fix' | 'announcement'
  published_at: string
  is_published: boolean
}

export async function getSiteUpdates(profileId: string | null): Promise<{
  updates: SiteUpdateRow[]
  unreadCount: number
}> {
  const supabase = await createClient()

  const { data: updates, error } = await supabase
    .from('site_updates')
    .select('id, title, body, category, published_at, is_published')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(20)

  if (error) {
    const log = createLogger('site-updates')
    log.warn('getSiteUpdates error', { context: { code: error.code } })
    return { updates: [], unreadCount: 0 }
  }

  let unreadCount = 0
  if (profileId && updates && updates.length > 0) {
    const updateIds = updates.map((u) => u.id)
    const { data: reads } = await supabase
      .from('site_update_reads')
      .select('update_id')
      .eq('profile_id', profileId)
      .in('update_id', updateIds)

    const readSet = new Set((reads ?? []).map((r) => r.update_id))
    unreadCount = updates.filter((u) => !readSet.has(u.id)).length
  } else if (!profileId && updates) {
    // Anonymous users see all as unread (they can't track reads)
    unreadCount = updates.length
  }

  return { updates: (updates ?? []) as SiteUpdateRow[], unreadCount }
}

export async function markSiteUpdatesRead(
  profileId: string,
  updateIds: string[],
): Promise<void> {
  const supabase = await createClient()

  const rows = updateIds.map((id) => ({
    profile_id: profileId,
    update_id: id,
  }))

  const { error } = await supabase.from('site_update_reads').upsert(rows, {
    onConflict: 'profile_id,update_id',
    ignoreDuplicates: true,
  })

  if (error) {
    const log = createLogger('site-updates')
    log.warn('markSiteUpdatesRead error', { context: { code: error.code } })
  }
}
