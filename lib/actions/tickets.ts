'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { TicketSchema, TicketMessageSchema } from '@/lib/schemas/tickets'
import { captureEvent } from '@/lib/analytics'
import { limitCreateTicket } from '@/lib/rate-limit'
import { validateAndSanitize } from '@/lib/utils/validation'
import type {
  CreateTicketResult,
  AddTicketMessageResult,
} from '@/lib/actions/tickets.types'

export async function createTicket(
  _prev: CreateTicketResult | null,
  formData: FormData,
): Promise<CreateTicketResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'Not authenticated.' }

  const rateLimit = await limitCreateTicket(user.id)
  if (!rateLimit.success) {
    return { ok: false, error: 'Rate limit exceeded. Try again later.' }
  }

  const parsed = validateAndSanitize(TicketSchema, {
    subject: formData.get('subject'),
    description: formData.get('description'),
    category: formData.get('category'),
    priority: formData.get('priority') ?? 'normal',
  })
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
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

  const { data: ticket, error: insertErr } = await supabase
    .from('tickets')
    .insert({
      profile_id: profile.id,
      subject: values.subject,
      description: values.description,
      category: values.category,
      priority: values.priority,
    })
    .select('id')
    .single()

  if (insertErr || !ticket) {
    console.error('[createTicket] insert failed', { code: insertErr?.code })
    return { ok: false, error: 'Something went wrong creating your ticket.' }
  }

  revalidatePath('/dashboard/tickets')

  void captureEvent(user.id, 'ticket_created', {
    ticket_id: ticket.id,
    category: values.category,
    priority: values.priority,
  })

  return { ok: true, ticketId: ticket.id }
}

export async function addTicketMessage(
  _prev: AddTicketMessageResult | null,
  formData: FormData,
): Promise<AddTicketMessageResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'Not authenticated.' }

  const parsed = validateAndSanitize(TicketMessageSchema, {
    ticketId: formData.get('ticketId'),
    content: formData.get('content'),
  })
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
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

  // Verify ticket ownership
  const { data: ticket, error: ticketErr } = await supabase
    .from('tickets')
    .select('id, profile_id')
    .eq('id', values.ticketId)
    .maybeSingle()
  if (ticketErr || !ticket) {
    return { ok: false, error: 'Ticket not found.' }
  }
  if (ticket.profile_id !== profile.id) {
    return { ok: false, error: 'You can only reply to your own tickets.' }
  }

  const { error: insertErr } = await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: values.ticketId,
      sender_profile_id: profile.id,
      content: values.content,
    })

  if (insertErr) {
    console.error('[addTicketMessage] insert failed', { code: insertErr.code })
    return { ok: false, error: 'Something went wrong sending your message.' }
  }

  revalidatePath(`/dashboard/tickets/${values.ticketId}`)
  return { ok: true }
}

// Simple wrapper for direct form use (no useActionState)
export async function addTicketMessageForm(formData: FormData): Promise<void> {
  await addTicketMessage(null, formData)
}
