import 'server-only'
import { createLogger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'

export interface NotificationRow {
  id: string
  type: 'message' | 'ticket' | 'dispute' | 'admin'
  title: string
  body: string
  link: string | null
  is_read: boolean
  created_at: string
  resource_id: string | null
}

export async function getNotifications(profileId: string): Promise<{
  notifications: NotificationRow[]
  unreadCount: number
}> {
  const supabase = await createClient()

  // Fetch unread message count per conversation
  const { data: unreadMessages, error: msgErr } = await supabase
    .from('conversation_participants')
    .select(
      `conversation_id, last_read_at,
       conversations!inner(
         messages!inner(
           id, sender_profile_id, created_at, content
         )
       )`,
    )
    .eq('profile_id', profileId)

  if (msgErr) {
    const log = createLogger('notifications')
    log.warn('getNotifications messages error', { context: { code: msgErr.code } })
  }

  const messageNotifications: NotificationRow[] = []
  for (const row of (unreadMessages ?? [])) {
    const msgs = (row.conversations as unknown as {
      messages: Array<{ id: string; sender_profile_id: string; created_at: string; content: string }>
    }).messages ?? []
    const lastRead = row.last_read_at
    for (const m of msgs) {
      if (m.sender_profile_id === profileId) continue
      if (!lastRead || new Date(m.created_at) > new Date(lastRead)) {
        messageNotifications.push({
          id: `msg-${m.id}`,
          type: 'message',
          title: 'New message',
          body: m.content,
          link: `/dashboard/messages/${row.conversation_id}`,
          is_read: false,
          created_at: m.created_at,
          resource_id: row.conversation_id,
        })
      }
    }
  }

  // Fetch tickets with updates (status changed or new reply in last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: tickets, error: ticketErr } = await supabase
    .from('tickets')
    .select('id, subject, status, updated_at')
    .eq('profile_id', profileId)
    .gte('updated_at', sevenDaysAgo)
    .order('updated_at', { ascending: false })

  if (ticketErr) {
    const log = createLogger('notifications')
    log.warn('getNotifications tickets error', { context: { code: ticketErr.code } })
  }

  const ticketNotifications: NotificationRow[] = (tickets ?? []).map((t) => ({
    id: `ticket-${t.id}`,
    type: 'ticket',
    title: 'Ticket update',
    body: `${t.subject} — ${t.status}`,
    link: `/dashboard/tickets/${t.id}`,
    // Tickets do not have per-user read tracking yet, so keep these informational.
    is_read: true,
    created_at: t.updated_at,
    resource_id: t.id,
  }))

  // Fetch disputes with updates (status changed in last 7 days)
  const { data: disputes, error: disputeErr } = await supabase
    .from('disputes')
    .select('id, reason, status, updated_at')
    .or(`initiator_profile_id.eq.${profileId},responder_profile_id.eq.${profileId}`)
    .gte('updated_at', sevenDaysAgo)
    .order('updated_at', { ascending: false })

  if (disputeErr) {
    const log = createLogger('notifications')
    log.warn('getNotifications disputes error', { context: { code: disputeErr.code } })
  }

  const disputeNotifications: NotificationRow[] = (disputes ?? []).map((d) => ({
    id: `dispute-${d.id}`,
    type: 'dispute',
    title: 'Dispute update',
    body: `${d.reason.slice(0, 60)}${d.reason.length > 60 ? '...' : ''} — ${d.status}`,
    link: `/dashboard/disputes/${d.id}`,
    // Disputes also lack read receipts, so avoid a permanently stale unread badge.
    is_read: true,
    created_at: d.updated_at,
    resource_id: d.id,
  }))

  // Combine, deduplicate, sort by created_at desc
  const all = [...messageNotifications, ...ticketNotifications, ...disputeNotifications]
  all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const unreadCount = all.filter((n) => !n.is_read).length

  return { notifications: all.slice(0, 20), unreadCount }
}
