'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { AdminDisputeMediationSchema, AdminDisputeResolutionSchema } from '@/lib/schemas/admin'
import { validateAndSanitize } from '@/lib/utils/validation'
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

  const parsed = validateAndSanitize(AdminDisputeMediationSchema, {
    disputeId: formData.get('disputeId'),
    content: formData.get('content'),
    mediatorProfileId: formData.get('mediatorProfileId'),
  })
  if (!parsed.ok) {
    return { ok: false, error: parsed.error }
  }

  // Insert mediator message
  const { error: msgErr } = await supabaseAdmin.from('dispute_messages').insert({
    dispute_id: parsed.data.disputeId,
    sender_profile_id: parsed.data.mediatorProfileId,
    content: parsed.data.content,
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
      mediator_profile_id: parsed.data.mediatorProfileId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.disputeId)
    .eq('status', 'open')

  if (updateErr) {
    console.error('[adminMediateDispute] status update failed', { code: updateErr.code })
    // Don't fail — message was sent
  }

  revalidatePath(`/admin/disputes/${parsed.data.disputeId}`)
  revalidatePath(`/dashboard/disputes/${parsed.data.disputeId}`)
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

  const parsed = validateAndSanitize(AdminDisputeResolutionSchema, {
    disputeId: formData.get('disputeId'),
    resolution: formData.get('resolution'),
    outcome: formData.get('outcome'),
    mediatorProfileId: formData.get('mediatorProfileId'),
  })
  if (!parsed.ok) {
    return { ok: false, error: parsed.error }
  }

  const { error } = await supabaseAdmin
    .from('disputes')
    .update({
      status: 'resolved',
      resolution: parsed.data.resolution,
      resolution_outcome: parsed.data.outcome,
      mediator_profile_id: parsed.data.mediatorProfileId,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.disputeId)

  if (error) {
    console.error('[adminResolveDispute] failed', { code: error.code })
    return { ok: false, error: error.message }
  }

  revalidatePath(`/admin/disputes/${parsed.data.disputeId}`)
  revalidatePath(`/dashboard/disputes/${parsed.data.disputeId}`)
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
