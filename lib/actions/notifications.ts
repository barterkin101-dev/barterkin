'use server'

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('notifications')

export async function markNotificationsReadAction(notificationIds: string[]): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!profile) return

  const { error } = await supabase
    .from('in_app_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('profile_id', profile.id)
    .in('id', notificationIds)

  if (error) {
    log.warn('markNotificationsReadAction error', { context: { code: error.code } })
  }
}
