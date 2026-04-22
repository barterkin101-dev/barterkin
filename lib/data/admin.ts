import 'server-only'
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

// ---------------------------------------------------------------------------
// ADMIN-01 — stats dashboard COUNT queries (parallel)
// ---------------------------------------------------------------------------
export async function getAdminStats(): Promise<AdminStats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [totalMembers, totalContacts, newThisWeek] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('contact_requests').select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),
  ])

  if (totalMembers.error) {
    console.error('[getAdminStats] totalMembers error', { code: totalMembers.error.code })
    throw new Error(totalMembers.error.message)
  }
  if (totalContacts.error) {
    console.error('[getAdminStats] totalContacts error', { code: totalContacts.error.code })
    throw new Error(totalContacts.error.message)
  }
  if (newThisWeek.error) {
    console.error('[getAdminStats] newThisWeek error', { code: newThisWeek.error.code })
    throw new Error(newThisWeek.error.message)
  }

  return {
    totalMembers: totalMembers.count ?? 0,
    totalContacts: totalContacts.count ?? 0,
    newThisWeek: newThisWeek.count ?? 0,
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
    console.error('[getAdminMembers] query error', { code: error.code })
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
    console.error('[getAdminMemberById] query error', { code: error.code })
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

// ---------------------------------------------------------------------------
// ADMIN-05 — contact requests list with optional status filter
// ---------------------------------------------------------------------------
export async function getAdminContacts(status?: string): Promise<AdminContactRow[]> {
  // FK hints required because contact_requests has TWO FKs to profiles
  // (sender_id + recipient_id). Verified FK names from Postgres default naming:
  //   - contact_requests_sender_id_fkey
  //   - contact_requests_recipient_id_fkey
  let q = supabaseAdmin
    .from('contact_requests')
    .select(`
      id, message, status, created_at,
      sender:profiles!contact_requests_sender_id_fkey(display_name),
      recipient:profiles!contact_requests_recipient_id_fkey(display_name)
    `)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    q = q.eq('status', status)
  }

  const { data, error } = await q
  if (error) {
    console.error('[getAdminContacts] query error', { code: error.code })
    throw new Error(error.message)
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    message: row.message as string,
    status: row.status as AdminContactRow['status'],
    created_at: row.created_at as string,
    sender_display_name: ((row.sender as { display_name?: string } | null)?.display_name as string | undefined) ?? null,
    recipient_display_name: ((row.recipient as { display_name?: string } | null)?.display_name as string | undefined) ?? null,
  }))
}
