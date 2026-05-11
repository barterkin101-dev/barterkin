import 'server-only'
import { createLogger } from '@/lib/utils/logger'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface AdminTicketRow {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  category: string
  created_at: string
  updated_at: string
  profile_id: string
  profile_display_name: string | null
  profile_username: string | null
  message_count: number
}

export interface AdminTicketMessageRow {
  id: string
  ticket_id: string
  sender_profile_id: string | null
  content: string
  is_internal: boolean
  created_at: string
  sender_display_name: string | null
  sender_username: string | null
  sender_avatar_url: string | null
}

export async function getAdminTickets(): Promise<AdminTicketRow[]> {
  const { data, error } = await supabaseAdmin
    .from('tickets')
    .select(
      `id, subject, description, status, priority, category, created_at, updated_at,
       profile_id,
       profiles!inner(display_name, username),
       ticket_messages(count)`,
    )
    .order('created_at', { ascending: false })

  if (error) {
    const log = createLogger('admin')
    log.error('getAdminTickets error', { context: { code: error.code } })
    throw new Error(error.message)
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const profile = row.profiles as { display_name?: string; username?: string } | null
    const msgs = row.ticket_messages as Array<Record<string, unknown>> | null
    return {
      id: row.id as string,
      subject: row.subject as string,
      description: row.description as string,
      status: row.status as string,
      priority: row.priority as string,
      category: row.category as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      profile_id: row.profile_id as string,
      profile_display_name: profile?.display_name ?? null,
      profile_username: profile?.username ?? null,
      message_count: (msgs?.[0] as { count?: number } | undefined)?.count ?? 0,
    }
  })
}

export async function getAdminTicketMessages(ticketId: string): Promise<AdminTicketMessageRow[]> {
  const { data, error } = await supabaseAdmin
    .from('ticket_messages')
    .select(
      `id, ticket_id, sender_profile_id, content, is_internal, created_at,
       profiles!left(display_name, username, avatar_url)`,
    )
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (error) {
    const log = createLogger('admin')
    log.error('getAdminTicketMessages error', { context: { code: error.code } })
    throw new Error(error.message)
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const sender = row.profiles as { display_name?: string; username?: string; avatar_url?: string } | null
    return {
      id: row.id as string,
      ticket_id: row.ticket_id as string,
      sender_profile_id: row.sender_profile_id as string | null,
      content: row.content as string,
      is_internal: row.is_internal as boolean,
      created_at: row.created_at as string,
      sender_display_name: sender?.display_name ?? null,
      sender_username: sender?.username ?? null,
      sender_avatar_url: sender?.avatar_url ?? null,
    }
  })
}

export async function getAdminTicketById(ticketId: string): Promise<AdminTicketRow | null> {
  const { data, error } = await supabaseAdmin
    .from('tickets')
    .select(
      `id, subject, description, status, priority, category, created_at, updated_at,
       profile_id,
       profiles!inner(display_name, username)`,
    )
    .eq('id', ticketId)
    .maybeSingle()

  if (error) {
    const log = createLogger('admin')
    log.error('getAdminTicketById error', { context: { code: error.code } })
    return null
  }
  if (!data) return null

  const row = data as Record<string, unknown>
  const profile = row.profiles as { display_name?: string; username?: string } | null
  return {
    id: row.id as string,
    subject: row.subject as string,
    description: row.description as string,
    status: row.status as string,
    priority: row.priority as string,
    category: row.category as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    profile_id: row.profile_id as string,
    profile_display_name: profile?.display_name ?? null,
    profile_username: profile?.username ?? null,
    message_count: 0,
  }
}
