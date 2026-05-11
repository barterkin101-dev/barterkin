import 'server-only'
import { createLogger } from '@/lib/utils/logger'
import { supabaseAdmin } from '@/lib/supabase/admin'

// ============================================================================
// Phase 8 Admin Dashboard — service-role data layer
// ============================================================================
// All functions bypass RLS. Callers MUST be Server Components/Actions gated by
// the /admin/* middleware guard (ADMIN-06). Never call from a Client Component.
// ============================================================================

export interface AdminStats {
  totalMembers: number
  totalContacts: number
  newThisWeek: number
  totalListings: number
  totalTickets: number
  totalDisputes: number
  totalConversations: number
  totalMessages: number
}

export interface AdminMemberRow {
  id: string
  display_name: string | null
  is_published: boolean
  banned: boolean
  created_at: string
  county_name: string | null
  avatar_url: string | null
}

export interface AdminMemberDetail {
  id: string
  owner_id: string
  display_name: string | null
  username: string | null
  bio: string | null
  avatar_url: string | null
  is_published: boolean
  banned: boolean
  accepting_contact: boolean
  tiktok_handle: string | null
  availability: string | null
  founding_member: boolean
  created_at: string
  county_name: string | null
  category_name: string | null
  skills_offered: Array<{ skill_text: string; sort_order: number }>
  skills_wanted: Array<{ skill_text: string; sort_order: number }>
}

export interface AdminContactRow {
  id: string
  message: string
  status: 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed'
  created_at: string
  sender_display_name: string | null
  recipient_display_name: string | null
}

export interface AdminConversationRow {
  id: string
  listing_id: string | null
  created_at: string
  updated_at: string
  participant_names: string[]
  last_message: string | null
  message_count: number
}

// ---------------------------------------------------------------------------
// ADMIN-01 — stats dashboard COUNT queries (parallel)
// ---------------------------------------------------------------------------
export async function getAdminStats(): Promise<AdminStats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    totalMembers,
    totalMessages,
    newThisWeek,
    totalListings,
    totalTickets,
    totalDisputes,
    totalConversations,
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('messages').select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),
    supabaseAdmin.from('listings').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('tickets').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('disputes').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('conversations').select('id', { count: 'exact', head: true }),
  ])

  if (totalMembers.error) {
    const log = createLogger('admin')
    log.error('getAdminStats totalMembers error', { context: { code: totalMembers.error.code } })
    throw new Error(totalMembers.error.message)
  }
  if (newThisWeek.error) {
    const log = createLogger('admin')
    log.error('getAdminStats newThisWeek error', { context: { code: newThisWeek.error.code } })
    throw new Error(newThisWeek.error.message)
  }

  return {
    totalMembers: totalMembers.count ?? 0,
    totalContacts: totalMessages.count ?? 0,
    newThisWeek: newThisWeek.count ?? 0,
    totalListings: totalListings.count ?? 0,
    totalTickets: totalTickets.count ?? 0,
    totalDisputes: totalDisputes.count ?? 0,
    totalConversations: totalConversations.count ?? 0,
    totalMessages: totalMessages.count ?? 0,
  }
}

// ---------------------------------------------------------------------------
// ADMIN-02 — members list (all profiles, all states, newest first)
// ---------------------------------------------------------------------------
export async function getAdminMembers(): Promise<AdminMemberRow[]> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, is_published, banned, created_at, avatar_url, counties(name)')
    .order('created_at', { ascending: false })

  if (error) {
    const log = createLogger('admin')
    log.error('getAdminMembers query error', { context: { code: error.code } })
    throw new Error(error.message)
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    display_name: (row.display_name as string | null) ?? null,
    is_published: row.is_published as boolean,
    banned: row.banned as boolean,
    created_at: row.created_at as string,
    avatar_url: (row.avatar_url as string | null) ?? null,
    county_name: ((row.counties as { name?: string } | null)?.name as string | undefined) ?? null,
  }))
}

// ---------------------------------------------------------------------------
// ADMIN-03 — member detail by id (full profile + skills + county + category)
// ---------------------------------------------------------------------------
export async function getAdminMemberById(id: string): Promise<AdminMemberDetail | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id, owner_id, display_name, username, bio, avatar_url,
      is_published, banned, accepting_contact, tiktok_handle,
      availability, founding_member, created_at,
      counties(name),
      categories(name),
      skills_offered(skill_text, sort_order),
      skills_wanted(skill_text, sort_order)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    const log = createLogger('admin')
    log.error('getAdminMemberById query error', { context: { code: error.code } })
    return null
  }
  if (!data) return null

  const row = data as Record<string, unknown>
  return {
    id: row.id as string,
    owner_id: row.owner_id as string,
    display_name: (row.display_name as string | null) ?? null,
    username: (row.username as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    is_published: row.is_published as boolean,
    banned: row.banned as boolean,
    accepting_contact: row.accepting_contact as boolean,
    tiktok_handle: (row.tiktok_handle as string | null) ?? null,
    availability: (row.availability as string | null) ?? null,
    founding_member: row.founding_member as boolean,
    created_at: row.created_at as string,
    county_name: ((row.counties as { name?: string } | null)?.name as string | undefined) ?? null,
    category_name: ((row.categories as { name?: string } | null)?.name as string | undefined) ?? null,
    skills_offered: (row.skills_offered as Array<{ skill_text: string; sort_order: number }>) ?? [],
    skills_wanted: (row.skills_wanted as Array<{ skill_text: string; sort_order: number }>) ?? [],
  }
}

// ADMIN-05 — retired: contact_requests replaced by conversations/messages
// This function is kept for backward compatibility with existing test contracts.
// It always returns an empty array since the contact_requests table no longer exists.
export async function getAdminContacts(_statusFilter?: string): Promise<AdminContactRow[]> {
  void _statusFilter
  return []
}

// ---------------------------------------------------------------------------
// ADMIN-06 — conversations list for admin oversight
// ---------------------------------------------------------------------------
export async function getAdminConversations(): Promise<AdminConversationRow[]> {
  const { data: convs, error: convErr } = await supabaseAdmin
    .from('conversations')
    .select('id, listing_id, created_at, updated_at')
    .order('updated_at', { ascending: false })

  if (convErr) {
    const log = createLogger('admin')
    log.error('getAdminConversations query error', { context: { code: convErr.code } })
    return []
  }

  const conversationIds = (convs ?? []).map((c) => c.id)
  if (conversationIds.length === 0) return []

  // Fetch participants with profile names
  const { data: participants, error: partErr } = await supabaseAdmin
    .from('conversation_participants')
    .select(
      `conversation_id, profile_id, profiles!inner(id, display_name, username)`,
    )
    .in('conversation_id', conversationIds)

  if (partErr) {
    const log = createLogger('admin')
    log.warn('getAdminConversations participants error', { context: { code: partErr.code } })
  }

  // Fetch message counts + last message per conversation
  const { data: messages, error: msgErr } = await supabaseAdmin
    .from('messages')
    .select('conversation_id, content, created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false })

  if (msgErr) {
    const log = createLogger('admin')
    log.warn('getAdminConversations messages error', { context: { code: msgErr.code } })
  }

  // Build participant name map
  const participantNamesByConv: Record<string, string[]> = {}
  for (const p of (participants ?? [])) {
    if (!participantNamesByConv[p.conversation_id]) {
      participantNamesByConv[p.conversation_id] = []
    }
    const profile = p.profiles as unknown as { display_name: string | null; username: string | null }
    const name = profile.display_name ?? profile.username ?? 'Member'
    participantNamesByConv[p.conversation_id].push(name)
  }

  // Build message stats per conversation
  const messageCountByConv: Record<string, number> = {}
  const lastMessageByConv: Record<string, string> = {}
  for (const m of (messages ?? [])) {
    messageCountByConv[m.conversation_id] = (messageCountByConv[m.conversation_id] ?? 0) + 1
    if (!lastMessageByConv[m.conversation_id]) {
      lastMessageByConv[m.conversation_id] = m.content
    }
  }

  return (convs ?? []).map((c) => ({
    id: c.id,
    listing_id: c.listing_id,
    created_at: c.created_at,
    updated_at: c.updated_at,
    participant_names: participantNamesByConv[c.id] ?? [],
    last_message: lastMessageByConv[c.id] ?? null,
    message_count: messageCountByConv[c.id] ?? 0,
  }))
}
