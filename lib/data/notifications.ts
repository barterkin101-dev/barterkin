import 'server-only'
import { createLogger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'

export interface NotificationRow {
  id: string
  type: 'message' | 'ticket' | 'dispute' | 'admin' | 'trade'
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

  const { data: tradeCompletions, error: tradeErr } = await supabase
    .from('trade_completions')
    .select('conversation_id, initiator_profile_id, recipient_profile_id, completed_at')
    .eq('status', 'completed')
    .or(`initiator_profile_id.eq.${profileId},recipient_profile_id.eq.${profileId}`)
    .order('completed_at', { ascending: false })

  if (tradeErr) {
    const log = createLogger('notifications')
    log.warn('getNotifications trades error', { context: { code: tradeErr.code } })
  }

  const tradeNotifications: NotificationRow[] = []
  const tradeProfileIds = [...new Set(
    (tradeCompletions ?? []).flatMap((completion) => [
      completion.initiator_profile_id,
      completion.recipient_profile_id,
    ]),
  )]

  const tradeProfileMap = new Map<string, { display_name: string | null; username: string | null }>()
  if (tradeProfileIds.length > 0) {
    const { data: tradeProfiles, error: tradeProfilesErr } = await supabase
      .from('profiles')
      .select('id, display_name, username')
      .in('id', tradeProfileIds)

    if (tradeProfilesErr) {
      const log = createLogger('notifications')
      log.warn('getNotifications trade profile lookup error', {
        context: { code: tradeProfilesErr.code },
      })
    }

    for (const profile of tradeProfiles ?? []) {
      tradeProfileMap.set(profile.id, {
        display_name: profile.display_name,
        username: profile.username,
      })
    }
  }

  for (const completion of tradeCompletions ?? []) {
    const rateeProfileId = completion.initiator_profile_id === profileId
      ? completion.recipient_profile_id
      : completion.initiator_profile_id

    const { data: existingRating, error: ratingErr } = await supabase
      .from('ratings')
      .select('id')
      .eq('rater_profile_id', profileId)
      .eq('ratee_profile_id', rateeProfileId)
      .eq('conversation_id', completion.conversation_id)
      .maybeSingle()

    if (ratingErr) {
      const log = createLogger('notifications')
      log.warn('getNotifications trade rating check error', { context: { code: ratingErr.code } })
      continue
    }

    if (existingRating) continue

    const otherProfileId = completion.initiator_profile_id === profileId
      ? completion.recipient_profile_id
      : completion.initiator_profile_id
    const otherProfile = tradeProfileMap.get(otherProfileId)
    const otherDisplayName = otherProfile?.display_name ?? otherProfile?.username ?? 'your trading partner'

    tradeNotifications.push({
      id: `trade-${completion.conversation_id}`,
      type: 'trade',
      title: 'Leave a trade review',
      body: `Your trade with ${otherDisplayName} is complete. Leave a review while it’s fresh.`,
      link: `/dashboard/messages/${completion.conversation_id}`,
      is_read: false,
      created_at: completion.completed_at ?? new Date(0).toISOString(),
      resource_id: completion.conversation_id,
    })
  }

  // Combine, deduplicate, sort by created_at desc
  const all = [...messageNotifications, ...ticketNotifications, ...disputeNotifications, ...tradeNotifications]
  all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const unreadCount = all.filter((n) => !n.is_read).length

  return { notifications: all.slice(0, 20), unreadCount }
}
