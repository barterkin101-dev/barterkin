'use server'

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('site-updates')

export async function markSiteUpdatesReadAction(updateIds: string[]): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!profile) return

  const rows = updateIds.map((id) => ({
    profile_id: profile.id,
    update_id: id,
  }))

  const { error } = await supabase.from('site_update_reads').upsert(rows, {
    onConflict: 'profile_id,update_id',
    ignoreDuplicates: true,
  })

  if (error) {
    log.warn('markSiteUpdatesReadAction error', { context: { code: error.code } })
  }
}
