import 'server-only'
import { createLogger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'

export interface TicketRow {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  category: string
  created_at: string
  updated_at: string
}

export interface TicketMessageRow {
  id: string
  ticket_id: string
  sender_profile_id: string | null
  content: string
  is_internal: boolean
  created_at: string
  sender: {
    id: string
    display_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
}

export async function getTickets(profileId: string): Promise<TicketRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tickets')
    .select('id, subject, description, status, priority, category, created_at, updated_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  if (error) {
    const log = createLogger('tickets')
    log.error('getTickets error', { context: { code: error.code } })
    return []
  }

  return (data ?? []) as TicketRow[]
}

export async function getTicketMessages(ticketId: string): Promise<TicketMessageRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ticket_messages')
    .select(
      `id, ticket_id, sender_profile_id, content, is_internal, created_at,
       profiles!left(id, display_name, username, avatar_url)`,
    )
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (error) {
    const log = createLogger('tickets')
    log.error('getTicketMessages error', { context: { code: error.code } })
    return []
  }

  return (data ?? []).map((m) => ({
    id: m.id,
    ticket_id: m.ticket_id,
    sender_profile_id: m.sender_profile_id,
    content: m.content,
    is_internal: m.is_internal,
    created_at: m.created_at,
    sender: m.profiles as unknown as TicketMessageRow['sender'],
  }))
}
