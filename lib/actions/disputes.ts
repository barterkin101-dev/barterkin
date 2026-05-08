'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { DisputeSchema, DisputeMessageSchema, ResolveDisputeSchema } from '@/lib/schemas/disputes'
import { captureEvent } from '@/lib/analytics'
import { limitCreateDispute } from '@/lib/rate-limit'
import type {
  CreateDisputeResult,
  AddDisputeMessageResult,
  ResolveDisputeResult,
} from '@/lib/actions/disputes.types'

export async function createDispute(
  _prev: CreateDisputeResult | null,
  formData: FormData,
): Promise<CreateDisputeResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'Not authenticated.' }

  const rateLimit = await limitCreateDispute(user.id)
  if (!rateLimit.success) {
    return { ok: false, error: 'Rate limit exceeded. Try again later.' }
  }

  const parsed = DisputeSchema.safeParse({
    responderProfileId: formData.get('responderProfileId'),
    listingId: formData.get('listingId') || undefined,
    conversationId: formData.get('conversationId') || undefined,
    reason: formData.get('reason'),
  })
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Please fix the highlighted fields.',
    }
  }
  const values = parsed.data

  const { data: initiator, error: initErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (initErr || !initiator) {
    return { ok: false, error: 'Profile not found.' }
  }

  if (initiator.id === values.responderProfileId) {
    return { ok: false, error: "You can't open a dispute with yourself." }
  }

  const { data: dispute, error: insertErr } = await supabase
    .from('disputes')
    .insert({
      initiator_profile_id: initiator.id,
      responder_profile_id: values.responderProfileId,
      listing_id: values.listingId ?? null,
      conversation_id: values.conversationId ?? null,
      reason: values.reason,
    })
    .select('id')
    .single()

  if (insertErr || !dispute) {
    console.error('[createDispute] insert failed', { code: insertErr?.code })
    return { ok: false, error: 'Something went wrong opening the dispute.' }
  }

  revalidatePath('/dashboard/disputes')

  void captureEvent(user.id, 'dispute_opened', {
    dispute_id: dispute.id,
    responder_profile_id: values.responderProfileId,
    listing_id: values.listingId ?? null,
  })

  return { ok: true, disputeId: dispute.id }
}

export async function addDisputeMessage(
  _prev: AddDisputeMessageResult | null,
  formData: FormData,
): Promise<AddDisputeMessageResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'Not authenticated.' }

  const parsed = DisputeMessageSchema.safeParse({
    disputeId: formData.get('disputeId'),
    content: formData.get('content'),
  })
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid message.',
    }
  }
  const values = parsed.data

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (profileErr || !profile) {
    return { ok: false, error: 'Profile not found.' }
  }

  // Verify participant
  const { data: dispute, error: disputeErr } = await supabase
    .from('disputes')
    .select('id, initiator_profile_id, responder_profile_id')
    .eq('id', values.disputeId)
    .maybeSingle()
  if (disputeErr || !dispute) {
    return { ok: false, error: 'Dispute not found.' }
  }

  const isParticipant =
    dispute.initiator_profile_id === profile.id ||
    dispute.responder_profile_id === profile.id
  if (!isParticipant) {
    return { ok: false, error: 'You are not a participant in this dispute.' }
  }

  const { error: insertErr } = await supabase
    .from('dispute_messages')
    .insert({
      dispute_id: values.disputeId,
      sender_profile_id: profile.id,
      content: values.content,
    })

  if (insertErr) {
    console.error('[addDisputeMessage] insert failed', { code: insertErr.code })
    return { ok: false, error: 'Something went wrong sending your message.' }
  }

  revalidatePath(`/dashboard/disputes/${values.disputeId}`)
  return { ok: true }
}

export async function resolveDispute(
  _prev: ResolveDisputeResult | null,
  formData: FormData,
): Promise<ResolveDisputeResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const parsed = ResolveDisputeSchema.safeParse({
    disputeId: formData.get('disputeId'),
    resolution: formData.get('resolution'),
    outcome: formData.get('outcome'),
  })
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
    }
  }
  const values = parsed.data

  // Only admin can resolve — check via admin email
  const adminEmail = process.env.ADMIN_EMAIL
  if (user.email !== adminEmail) {
    return { ok: false, error: 'Only admins can resolve disputes.' }
  }

  const { data: mediator } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  const { error } = await supabase
    .from('disputes')
    .update({
      status: 'resolved',
      resolution: values.resolution,
      resolution_outcome: values.outcome,
      mediator_profile_id: mediator?.id ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', values.disputeId)

  if (error) {
    console.error('[resolveDispute] update failed', { code: error.code })
    return { ok: false, error: 'Something went wrong resolving the dispute.' }
  }

  revalidatePath('/admin/disputes')
  revalidatePath(`/dashboard/disputes/${values.disputeId}`)
  return { ok: true }
}

// Simple wrapper for direct form use (no useActionState)
export async function addDisputeMessageForm(formData: FormData): Promise<void> {
  await addDisputeMessage(null, formData)
}
