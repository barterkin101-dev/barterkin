'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { SendMessageSchema, CreateConversationSchema } from '@/lib/schemas/messaging'
import { captureEvent } from '@/lib/analytics'
import { limitSendMessage } from '@/lib/rate-limit'
import { validateAndSanitize } from '@/lib/utils/validation'
import type {
  SendMessageResult,
  CreateConversationResult,
  MarkReadResult,
} from '@/lib/actions/messaging.types'

export async function sendMessage(
  _prev: SendMessageResult | null,
  formData: FormData,
): Promise<SendMessageResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'Not authenticated.' }

  const rateLimit = await limitSendMessage(user.id)
  if (!rateLimit.success) {
    return { ok: false, error: 'Rate limit exceeded. Please slow down.' }
  }

  const parsed = validateAndSanitize(SendMessageSchema, {
    conversationId: formData.get('conversationId'),
    content: formData.get('content'),
  })
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, fieldErrors: parsed.fieldErrors }
  }
  const values = parsed.data

  // Get sender profile
  const { data: senderProfile, error: senderErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (senderErr || !senderProfile) {
    return { ok: false, error: 'Profile not found.' }
  }

  // Verify participant
  const { data: participant, error: participantErr } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', values.conversationId)
    .eq('profile_id', senderProfile.id)
    .maybeSingle()
  if (participantErr || !participant) {
    return { ok: false, error: 'You are not a participant in this conversation.' }
  }

  const { data: message, error: insertErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: values.conversationId,
      sender_profile_id: senderProfile.id,
      content: values.content,
    })
    .select('id')
    .single()

  if (insertErr || !message) {
    console.error('[sendMessage] insert failed', { code: insertErr?.code })
    return { ok: false, error: 'Something went wrong sending your message.' }
  }

  // Update conversation updated_at
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', values.conversationId)

  revalidatePath('/dashboard/messages')
  revalidatePath(`/dashboard/messages/${values.conversationId}`)

  void captureEvent(user.id, 'message_sent', {
    conversation_id: values.conversationId,
  })

  return { ok: true, messageId: message.id }
}

export async function createConversation(
  _prev: CreateConversationResult | null,
  formData: FormData,
): Promise<CreateConversationResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'Not authenticated.' }

  const rateLimit = await limitSendMessage(user.id)
  if (!rateLimit.success) {
    return { ok: false, error: 'Rate limit exceeded. Please slow down.' }
  }

  const parsed = validateAndSanitize(CreateConversationSchema, {
    recipientProfileId: formData.get('recipientProfileId'),
    listingId: formData.get('listingId') || undefined,
    initialMessage: formData.get('initialMessage'),
  })
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, fieldErrors: parsed.fieldErrors }
  }
  const values = parsed.data

  // Get sender profile
  const { data: senderProfile, error: senderErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (senderErr || !senderProfile) {
    return { ok: false, error: 'Profile not found.' }
  }

  // Self-message guard
  if (senderProfile.id === values.recipientProfileId) {
    return { ok: false, error: "You can't message yourself." }
  }

  // Check for existing conversation between these two
  const { data: existingConv, error: existingErr } = await supabase.rpc(
    'find_conversation_between',
    {
      p_profile_a: senderProfile.id,
      p_profile_b: values.recipientProfileId,
    }
  )
  if (existingErr) {
    console.error('[createConversation] existing check failed', { code: existingErr.code })
  }

  let conversationId: string
  const firstConv = (existingConv as { id: string }[] | null)?.[0]

  if (firstConv?.id) {
    conversationId = firstConv.id
  } else {
    // Create conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        listing_id: values.listingId ?? null,
      })
      .select('id')
      .single()
    if (convErr || !conv) {
      console.error('[createConversation] conv insert failed', { code: convErr?.code })
      return { ok: false, error: 'Something went wrong creating the conversation.' }
    }
    conversationId = conv.id

    // Add participants
    const { error: partErr } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: conversationId, profile_id: senderProfile.id },
        { conversation_id: conversationId, profile_id: values.recipientProfileId },
      ])
    if (partErr) {
      console.error('[createConversation] participant insert failed', { code: partErr.code })
      return { ok: false, error: 'Something went wrong.' }
    }
  }

  // Insert initial message
  const { data: message, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_profile_id: senderProfile.id,
      content: values.initialMessage,
    })
    .select('id')
    .single()

  if (msgErr || !message) {
    console.error('[createConversation] message insert failed', { code: msgErr?.code })
    return { ok: false, error: 'Something went wrong sending your message.' }
  }

  revalidatePath('/dashboard/messages')

  void captureEvent(user.id, 'conversation_created', {
    conversation_id: conversationId,
    listing_id: values.listingId ?? null,
  })

  return { ok: true, conversationId }
}

export async function markConversationRead(
  _prev: MarkReadResult | null,
  formData: FormData,
): Promise<MarkReadResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'Not authenticated.' }

  const conversationId = String(formData.get('conversationId') ?? '')
  if (!conversationId) return { ok: false, error: 'Conversation ID is required.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!profile) return { ok: false, error: 'Profile not found.' }

  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('profile_id', profile.id)

  if (error) {
    console.error('[markConversationRead] update failed', { code: error.code })
    return { ok: false, error: 'Something went wrong.' }
  }

  revalidatePath('/dashboard/messages')
  return { ok: true }
}
