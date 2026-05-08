'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { assertAdmin } from './admin'

export interface AdminMediateDisputeResult {
  ok: boolean
  error?: string
}

export interface AdminResolveDisputeResult {
  ok: boolean
  error?: string
}

export async function adminMediateDispute(
  _prev: AdminMediateDisputeResult | null,
  formData: FormData,
): Promise<AdminMediateDisputeResult> {
  const auth = await assertAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }

  const disputeId = formData.get('disputeId')
  const content = formData.get('content')
  const mediatorProfileId = formData.get('mediatorProfileId')

  if (!disputeId || typeof disputeId !== 'string') {
    return { ok: false, error: 'Invalid dispute ID.' }
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return { ok: false, error: 'Message cannot be empty.' }
  }
  if (!mediatorProfileId || typeof mediatorProfileId !== 'string') {
    return { ok: false, error: 'Mediator profile required.' }
  }

  // Insert mediator message
  const { error: msgErr } = await supabaseAdmin.from('dispute_messages').insert({
    dispute_id: disputeId,
    sender_profile_id: mediatorProfileId,
    content: content.trim(),
  })

  if (msgErr) {
    console.error('[adminMediateDispute] message failed', { code: msgErr.code })
    return { ok: false, error: msgErr.message }
  }

  // Set status to mediating if still open
  const { error: updateErr } = await supabaseAdmin
    .from('disputes')
    .update({
      status: 'mediating',
      mediator_profile_id: mediatorProfileId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', disputeId)
    .eq('status', 'open')

  if (updateErr) {
    console.error('[adminMediateDispute] status update failed', { code: updateErr.code })
    // Don't fail — message was sent
  }

  revalidatePath(`/admin/disputes/${disputeId}`)
  revalidatePath(`/dashboard/disputes/${disputeId}`)
  revalidatePath('/admin/disputes')
  revalidatePath('/dashboard/disputes')
  return { ok: true }
}

export async function adminResolveDispute(
  _prev: AdminResolveDisputeResult | null,
  formData: FormData,
): Promise<AdminResolveDisputeResult> {
  const auth = await assertAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }

  const disputeId = formData.get('disputeId')
  const resolution = formData.get('resolution')
  const outcome = formData.get('outcome')
  const mediatorProfileId = formData.get('mediatorProfileId')

  if (!disputeId || typeof disputeId !== 'string') {
    return { ok: false, error: 'Invalid dispute ID.' }
  }
  if (!resolution || typeof resolution !== 'string' || resolution.trim().length === 0) {
    return { ok: false, error: 'Resolution is required.' }
  }
  if (!outcome || typeof outcome !== 'string') {
    return { ok: false, error: 'Outcome is required.' }
  }
  if (!mediatorProfileId || typeof mediatorProfileId !== 'string') {
    return { ok: false, error: 'Mediator profile required.' }
  }

  const { error } = await supabaseAdmin
    .from('disputes')
    .update({
      status: 'resolved',
      resolution: resolution.trim(),
      resolution_outcome: outcome,
      mediator_profile_id: mediatorProfileId,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', disputeId)

  if (error) {
    console.error('[adminResolveDispute] failed', { code: error.code })
    return { ok: false, error: error.message }
  }

  revalidatePath(`/admin/disputes/${disputeId}`)
  revalidatePath(`/dashboard/disputes/${disputeId}`)
  revalidatePath('/admin/disputes')
  revalidatePath('/dashboard/disputes')
  return { ok: true }
}

// Direct form wrappers
export async function adminMediateDisputeForm(formData: FormData): Promise<void> {
  await adminMediateDispute(null, formData)
}

export async function adminResolveDisputeForm(formData: FormData): Promise<void> {
  await adminResolveDispute(null, formData)
}
