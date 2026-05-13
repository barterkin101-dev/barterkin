'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { assertAdmin } from '@/lib/actions/admin'
import { createLogger } from '@/lib/utils/logger'
import { Resend } from 'resend'

const log = createLogger('admin:support')

// ============================================================================
// Schemas
// ============================================================================

const ReplySchema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().min(1, 'Reply cannot be empty.').max(5000, 'Reply too long (max 5000 chars).'),
})

const StatusSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(['open', 'in_progress', 'waiting', 'resolved', 'closed']),
})

// ============================================================================
// Types
// ============================================================================

export interface SupportTicket {
  id: string
  from_email: string
  from_name: string | null
  subject: string
  body_text: string
  body_html: string | null
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  source: string
  created_at: string
  updated_at: string
  reply_count?: number
}

export interface SupportReply {
  id: string
  support_ticket_id: string
  body: string
  sent_to: string
  sent_via: string
  sent_at: string
  created_at: string
}

export interface ListSupportTicketsResult {
  ok: boolean
  tickets?: SupportTicket[]
  error?: string
}

export interface GetSupportTicketResult {
  ok: boolean
  ticket?: SupportTicket
  replies?: SupportReply[]
  error?: string
}

export interface ReplyToTicketResult {
  ok: boolean
  reply?: SupportReply
  error?: string
}

export interface UpdateTicketStatusResult {
  ok: boolean
  error?: string
}

// ============================================================================
// Actions
// ============================================================================

export async function listSupportTickets(
  status?: string,
): Promise<ListSupportTicketsResult> {
  const auth = await assertAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }

  let query = supabaseAdmin
    .from('support_tickets')
    .select('*, reply_count:support_replies(count)')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    log.error('listSupportTickets failed', { context: { code: error.code, message: error.message } })
    return { ok: false, error: error.message }
  }

  // Transform count array to number
  const tickets = (data || []).map((t: Record<string, unknown>) => ({
    ...t,
    reply_count: Array.isArray(t.reply_count) ? t.reply_count.length : 0,
  })) as SupportTicket[]

  return { ok: true, tickets }
}

export async function getSupportTicket(
  ticketId: string,
): Promise<GetSupportTicketResult> {
  const auth = await assertAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }

  const parsed = z.string().uuid().safeParse(ticketId)
  if (!parsed.success) {
    return { ok: false, error: 'Invalid ticket ID.' }
  }

  const { data: ticket, error: ticketErr } = await supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('id', parsed.data)
    .single()

  if (ticketErr || !ticket) {
    log.error('getSupportTicket failed', {
      context: { code: ticketErr?.code, message: ticketErr?.message },
    })
    return { ok: false, error: ticketErr?.message || 'Ticket not found.' }
  }

  const { data: replies, error: repliesErr } = await supabaseAdmin
    .from('support_replies')
    .select('*')
    .eq('support_ticket_id', parsed.data)
    .order('created_at', { ascending: true })

  if (repliesErr) {
    log.error('getSupportTicket replies failed', {
      context: { code: repliesErr.code, message: repliesErr.message },
    })
  }

  return {
    ok: true,
    ticket: ticket as SupportTicket,
    replies: (replies || []) as SupportReply[],
  }
}

export async function replyToTicket(
  _prev: ReplyToTicketResult | null,
  formData: FormData,
): Promise<ReplyToTicketResult> {
  const auth = await assertAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }

  const raw = {
    ticketId: formData.get('ticketId') as string,
    body: formData.get('body') as string,
  }

  const parsed = ReplySchema.safeParse(raw)
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join('; ')
    return { ok: false, error: msg }
  }

  const { ticketId, body } = parsed.data

  // Fetch ticket to get recipient email
  const { data: ticket, error: ticketErr } = await supabaseAdmin
    .from('support_tickets')
    .select('from_email, subject, status')
    .eq('id', ticketId)
    .single()

  if (ticketErr || !ticket) {
    return { ok: false, error: 'Ticket not found.' }
  }

  // Send email via Resend
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY not configured.' }
  }

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: 'Barterkin Support <support@barterkin.com>',
      to: ticket.from_email,
      subject: `Re: ${ticket.subject}`,
      text: body,
    })
  } catch (err) {
    log.error('Failed to send support reply email', {
      context: { ticketId, to: ticket.from_email, error: String(err) },
    })
    return { ok: false, error: 'Failed to send email. Please try again.' }
  }

  // Record reply in DB
  const { data: reply, error: replyErr } = await supabaseAdmin
    .from('support_replies')
    .insert({
      support_ticket_id: ticketId,
      body,
      sent_to: ticket.from_email,
      sent_via: 'resend',
    })
    .select()
    .single()

  if (replyErr) {
    log.error('Failed to record support reply', {
      context: { code: replyErr.code, message: replyErr.message },
    })
    return { ok: false, error: replyErr.message }
  }

  // Auto-update ticket status to in_progress if it was open
  if (ticket.status === 'open') {
    await supabaseAdmin
      .from('support_tickets')
      .update({ status: 'in_progress' })
      .eq('id', ticketId)
  }

  revalidatePath('/admin/support')
  revalidatePath(`/admin/support/${ticketId}`)

  return { ok: true, reply: reply as SupportReply }
}

export async function updateTicketStatus(
  ticketId: string,
  status: string,
): Promise<UpdateTicketStatusResult> {
  const auth = await assertAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }

  const parsed = StatusSchema.safeParse({ ticketId, status })
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join('; ')
    return { ok: false, error: msg }
  }

  const { error } = await supabaseAdmin
    .from('support_tickets')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.ticketId)

  if (error) {
    log.error('updateTicketStatus failed', {
      context: { code: error.code, message: error.message },
    })
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/support')
  revalidatePath(`/admin/support/${ticketId}`)

  return { ok: true }
}
