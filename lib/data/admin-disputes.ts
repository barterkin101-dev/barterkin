import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface AdminDisputeRow {
  id: string
  reason: string
  status: string
  resolution: string | null
  resolution_outcome: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  initiator_profile_id: string
  initiator_display_name: string | null
  initiator_username: string | null
  responder_profile_id: string
  responder_display_name: string | null
  responder_username: string | null
  mediator_profile_id: string | null
  mediator_display_name: string | null
  message_count: number
}

export interface AdminDisputeMessageRow {
  id: string
  dispute_id: string
  sender_profile_id: string
  content: string
  created_at: string
  sender_display_name: string | null
  sender_username: string | null
  sender_avatar_url: string | null
}

export async function getAdminDisputes(): Promise<AdminDisputeRow[]> {
  const { data, error } = await supabaseAdmin
    .from('disputes')
    .select(
      `id, reason, status, resolution, resolution_outcome, created_at, updated_at, resolved_at,
       initiator_profile_id,
       initiator:profiles!disputes_initiator_profile_id_fkey(display_name, username),
       responder_profile_id,
       responder:profiles!disputes_responder_profile_id_fkey(display_name, username),
       mediator_profile_id,
       mediator:profiles!disputes_mediator_profile_id_fkey(display_name, username),
       dispute_messages(count)`,
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getAdminDisputes] error', { code: error.code })
    throw new Error(error.message)
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const initiator = row.initiator as { display_name?: string; username?: string } | null
    const responder = row.responder as { display_name?: string; username?: string } | null
    const mediator = row.mediator as { display_name?: string; username?: string } | null
    const msgs = row.dispute_messages as Array<Record<string, unknown>> | null
    return {
      id: row.id as string,
      reason: row.reason as string,
      status: row.status as string,
      resolution: (row.resolution as string | null) ?? null,
      resolution_outcome: (row.resolution_outcome as string | null) ?? null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      resolved_at: (row.resolved_at as string | null) ?? null,
      initiator_profile_id: row.initiator_profile_id as string,
      initiator_display_name: initiator?.display_name ?? null,
      initiator_username: initiator?.username ?? null,
      responder_profile_id: row.responder_profile_id as string,
      responder_display_name: responder?.display_name ?? null,
      responder_username: responder?.username ?? null,
      mediator_profile_id: (row.mediator_profile_id as string | null) ?? null,
      mediator_display_name: mediator?.display_name ?? null,
      message_count: (msgs?.[0] as { count?: number } | undefined)?.count ?? 0,
    }
  })
}

export async function getAdminDisputeMessages(disputeId: string): Promise<AdminDisputeMessageRow[]> {
  const { data, error } = await supabaseAdmin
    .from('dispute_messages')
    .select(
      `id, dispute_id, sender_profile_id, content, created_at,
       profiles!inner(display_name, username, avatar_url)`,
    )
    .eq('dispute_id', disputeId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getAdminDisputeMessages] error', { code: error.code })
    throw new Error(error.message)
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const sender = row.profiles as { display_name?: string; username?: string; avatar_url?: string } | null
    return {
      id: row.id as string,
      dispute_id: row.dispute_id as string,
      sender_profile_id: row.sender_profile_id as string,
      content: row.content as string,
      created_at: row.created_at as string,
      sender_display_name: sender?.display_name ?? null,
      sender_username: sender?.username ?? null,
      sender_avatar_url: sender?.avatar_url ?? null,
    }
  })
}

export async function getAdminDisputeById(disputeId: string): Promise<AdminDisputeRow | null> {
  const { data, error } = await supabaseAdmin
    .from('disputes')
    .select(
      `id, reason, status, resolution, resolution_outcome, created_at, updated_at, resolved_at,
       initiator_profile_id,
       initiator:profiles!disputes_initiator_profile_id_fkey(display_name, username),
       responder_profile_id,
       responder:profiles!disputes_responder_profile_id_fkey(display_name, username),
       mediator_profile_id,
       mediator:profiles!disputes_mediator_profile_id_fkey(display_name, username)`,
    )
    .eq('id', disputeId)
    .maybeSingle()

  if (error) {
    console.error('[getAdminDisputeById] error', { code: error.code })
    return null
  }
  if (!data) return null

  const row = data as Record<string, unknown>
  const initiator = row.initiator as { display_name?: string; username?: string } | null
  const responder = row.responder as { display_name?: string; username?: string } | null
  const mediator = row.mediator as { display_name?: string; username?: string } | null
  return {
    id: row.id as string,
    reason: row.reason as string,
    status: row.status as string,
    resolution: (row.resolution as string | null) ?? null,
    resolution_outcome: (row.resolution_outcome as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    resolved_at: (row.resolved_at as string | null) ?? null,
    initiator_profile_id: row.initiator_profile_id as string,
    initiator_display_name: initiator?.display_name ?? null,
    initiator_username: initiator?.username ?? null,
    responder_profile_id: row.responder_profile_id as string,
    responder_display_name: responder?.display_name ?? null,
    responder_username: responder?.username ?? null,
    mediator_profile_id: (row.mediator_profile_id as string | null) ?? null,
    mediator_display_name: mediator?.display_name ?? null,
    message_count: 0,
  }
}
