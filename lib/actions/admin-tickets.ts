'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { AdminTicketStatusSchema, AdminTicketReplySchema } from '@/lib/schemas/admin'
import { validateAndSanitize } from '@/lib/utils/validation'
import { assertAdmin } from './admin'
import { createLogger } from '@/lib/utils/logger'

export interface AdminUpdateTicketStatusResult {
  ok: boolean
  error?: string
}

export interface AdminReplyTicketResult {
  ok: boolean
  error?: string
}

export async function adminUpdateTicketStatus(
  _prev: AdminUpdateTicketStatusResult | null,
  formData: FormData,
): Promise<AdminUpdateTicketStatusResult> {
  const auth = await assertAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }

  const parsed = validateAndSanitize(AdminTicketStatusSchema, {
    ticketId: formData.get('ticketId'),
    status: formData.get('status'),
  })
  if (!parsed.ok) {
    return { ok: false, error: parsed.error }
  }

  const { error } = await supabaseAdmin
    .from('tickets')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.ticketId)

  if (error) {
    const log = createLogger('admin-tickets')
    log.error('adminUpdateTicketStatus failed', { error, context: { code: error.code } })
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/tickets')
  revalidatePath(`/admin/tickets/${parsed.data.ticketId}`)
  revalidatePath('/dashboard/tickets')
  revalidatePath(`/dashboard/tickets/${parsed.data.ticketId}`)
  return { ok: true }
}

export async function adminReplyTicket(
  _prev: AdminReplyTicketResult | null,
  formData: FormData,
): Promise<AdminReplyTicketResult> {
  const auth = await assertAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }

  const parsed = validateAndSanitize(AdminTicketReplySchema, {
    ticketId: formData.get('ticketId'),
    content: formData.get('content'),
  })
  if (!parsed.ok) {
    return { ok: false, error: parsed.error }
  }

  const { error } = await supabaseAdmin.from('ticket_messages').insert({
    ticket_id: parsed.data.ticketId,
    sender_profile_id: null, // null = system/admin
    content: parsed.data.content,
    is_internal: false,
  })

  if (error) {
    const log = createLogger('admin-tickets')
    log.error('adminReplyTicket failed', { error, context: { code: error.code } })
    return { ok: false, error: error.message }
  }

  // Update ticket updated_at
  await supabaseAdmin
    .from('tickets')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', parsed.data.ticketId)

  revalidatePath(`/admin/tickets/${parsed.data.ticketId}`)
  revalidatePath(`/dashboard/tickets/${parsed.data.ticketId}`)
  return { ok: true }
}

// Direct form wrappers
export async function adminUpdateTicketStatusForm(formData: FormData): Promise<void> {
  await adminUpdateTicketStatus(null, formData)
}

export async function adminReplyTicketForm(formData: FormData): Promise<void> {
  await adminReplyTicket(null, formData)
}
