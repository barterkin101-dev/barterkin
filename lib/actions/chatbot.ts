'use server'

import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateBotResponse, escalateToTicket } from '@/lib/chatbot/engine'
import { getClientIp, limitChatbotMessage } from '@/lib/rate-limit-public'
import type { BotResponse } from '@/lib/chatbot/engine'
import type { Json } from '@/lib/database.types'

export type SendMessageResult =
  | { ok: true; botResponse: BotResponse; sessionId: string }
  | { ok: false; error: string }

export type CreateTicketFromChatResult =
  | { ok: true; ticketId: string }
  | { ok: false; error: string }

export async function sendChatMessage(
  _prev: SendMessageResult | null,
  formData: FormData,
): Promise<SendMessageResult> {
  // Rate limit: 30 chat messages per minute per IP (unauthenticated-friendly)
  const ip = await getClientIp()
  const limit = await limitChatbotMessage(ip)
  if (!limit.success) {
    return { ok: false, error: 'Too many messages. Please slow down.' }
  }

  const sessionId = String(formData.get('sessionId') ?? '')
  const message = String(formData.get('message') ?? '').trim()

  if (!message) {
    return { ok: false, error: 'Message is required.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Resolve or create session
  let sid = sessionId
  if (!sid) {
    const { data: session } = await getSupabaseAdmin()
      .from('chat_sessions')
      .insert({
        profile_id: user ? (await getProfileId(supabase, user.id)) : null,
        user_email: user?.email ?? null,
      })
      .select('id')
      .single()
    if (!session) return { ok: false, error: 'Failed to start chat session.' }
    sid = session.id
  }

  // Store user message
  await getSupabaseAdmin()
    .from('chat_messages')
    .insert({ session_id: sid, role: 'user', content: message })

  // Build context
  const context = {
    email: user?.email ?? undefined,
    profileId: user ? (await getProfileId(supabase, user.id)) : undefined,
  }

  // Generate bot response
  const botResponse = await generateBotResponse(message, context)

  // Store bot response
  await getSupabaseAdmin()
    .from('chat_messages')
    .insert({
      session_id: sid,
      role: 'bot',
      content: botResponse.text,
      intent: botResponse.intent,
      metadata: { actions: botResponse.actions } as unknown as Json,
    })

  return { ok: true, botResponse, sessionId: sid }
}

export async function createTicketFromChat(
  _prev: CreateTicketFromChatResult | null,
  formData: FormData,
): Promise<CreateTicketFromChatResult> {
  const sessionId = String(formData.get('sessionId') ?? '')
  const subject = String(formData.get('subject') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()

  if (!sessionId || !subject || !body) {
    return { ok: false, error: 'Session, subject, and body are required.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const result = await escalateToTicket(
    sessionId,
    subject,
    body,
    user?.email ?? undefined,
    user ? (await getProfileId(supabase, user.id)) : undefined,
  )

  return result
}

async function getProfileId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | undefined> {
  const { data } = await supabase.from('profiles').select('id').eq('owner_id', userId).maybeSingle()
  return data?.id
}


