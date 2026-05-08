'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'

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
  const ticketId = formData.get('ticketId')
  const status = formData.get('status')

  if (!ticketId || typeof ticketId !== 'string') {
    return { ok: false, error: 'Invalid ticket ID.' }
  }
  if (!status || typeof status !== 'string') {
    return { ok: false, error: 'Invalid status.' }
  }

  const allowed = new Set(['open', 'in_progress', 'waiting', 'resolved', 'closed'])
  if (!allowed.has(status)) {
    return { ok: false, error: 'Invalid status value.' }
  }

  const { error } = await supabaseAdmin
    .from('tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId)

  if (error) {
    console.error('[adminUpdateTicketStatus] failed', { code: error.code })
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/tickets')
  revalidatePath(`/admin/tickets/${ticketId}`)
  revalidatePath('/dashboard/tickets')
  revalidatePath(`/dashboard/tickets/${ticketId}`)
  return { ok: true }
}

export async function adminReplyTicket(
  _prev: AdminReplyTicketResult | null,
  formData: FormData,
): Promise<AdminReplyTicketResult> {
  const ticketId = formData.get('ticketId')
  const content = formData.get('content')

  if (!ticketId || typeof ticketId !== 'string') {
    return { ok: false, error: 'Invalid ticket ID.' }
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return { ok: false, error: 'Reply cannot be empty.' }
  }

  const { error } = await supabaseAdmin.from('ticket_messages').insert({
    ticket_id: ticketId,
    sender_profile_id: null, // null = system/admin
    content: content.trim(),
    is_internal: false,
  })

  if (error) {
    console.error('[adminReplyTicket] failed', { code: error.code })
    return { ok: false, error: error.message }
  }

  // Update ticket updated_at
  await supabaseAdmin
    .from('tickets')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', ticketId)

  revalidatePath(`/admin/tickets/${ticketId}`)
  revalidatePath(`/dashboard/tickets/${ticketId}`)
  return { ok: true }
}

// Direct form wrappers
export async function adminUpdateTicketStatusForm(formData: FormData): Promise<void> {
  await adminUpdateTicketStatus(null, formData)
}

export async function adminReplyTicketForm(formData: FormData): Promise<void> {
  await adminReplyTicket(null, formData)
}
