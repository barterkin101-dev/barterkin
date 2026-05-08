import 'server-only'
import { createClient } from '@/lib/supabase/server'

export interface DisputeRow {
  id: string
  initiator_profile_id: string
  responder_profile_id: string
  listing_id: string | null
  conversation_id: string | null
  reason: string
  status: string
  resolution: string | null
  resolution_outcome: string | null
  mediator_profile_id: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  initiator: {
    id: string
    display_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
  responder: {
    id: string
    display_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
}

export interface DisputeMessageRow {
  id: string
  dispute_id: string
  sender_profile_id: string
  content: string
  created_at: string
  sender: {
    id: string
    display_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
}

export async function getDisputes(profileId: string): Promise<DisputeRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('disputes')
    .select(
      `id, initiator_profile_id, responder_profile_id, listing_id, conversation_id,
       reason, status, resolution, resolution_outcome, mediator_profile_id,
       created_at, updated_at, resolved_at,
       initiator:profiles!disputes_initiator_profile_id_fkey(id, display_name, username, avatar_url),
       responder:profiles!disputes_responder_profile_id_fkey(id, display_name, username, avatar_url)`,
    )
    .or(`initiator_profile_id.eq.${profileId},responder_profile_id.eq.${profileId}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getDisputes] error', { code: error.code })
    return []
  }

  return (data ?? []).map((d) => ({
    ...d,
    initiator: d.initiator as unknown as DisputeRow['initiator'],
    responder: d.responder as unknown as DisputeRow['responder'],
  }))
}

export async function getDisputeMessages(disputeId: string): Promise<DisputeMessageRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dispute_messages')
    .select(
      `id, dispute_id, sender_profile_id, content, created_at,
       profiles!inner(id, display_name, username, avatar_url)`,
    )
    .eq('dispute_id', disputeId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getDisputeMessages] error', { code: error.code })
    return []
  }

  return (data ?? []).map((m) => ({
    id: m.id,
    dispute_id: m.dispute_id,
    sender_profile_id: m.sender_profile_id,
    content: m.content,
    created_at: m.created_at,
    sender: m.profiles as unknown as DisputeMessageRow['sender'],
  }))
}
