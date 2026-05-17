'use server'

import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { awardQuest } from '@/lib/actions/quests'
import { captureEvent } from '@/lib/analytics'
import { createLogger } from '@/lib/utils/logger'
import { RatingSchema } from '@/lib/schemas/ratings'
import { validateAndSanitize } from '@/lib/utils/validation'
import type {
  MarkTradeCompleteResult,
  SubmitTradeReviewResult,
} from '@/lib/actions/trade-completions.types'
import { TradeReviewRequestEmail } from '@/emails/trade-review-request'

async function sendTradeReviewPrompts(conversationId: string) {
  const log = createLogger('trade-completions')
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    log.warn('RESEND_API_KEY missing; trade review prompt skipped')
    return
  }

  try {
    const admin = getSupabaseAdmin()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'

    const { data: completion, error: completionErr } = await admin
      .from('trade_completions')
      .select('conversation_id, listing_id, initiator_profile_id, recipient_profile_id')
      .eq('conversation_id', conversationId)
      .maybeSingle()

    if (completionErr || !completion) {
      log.warn('trade completion prompt lookup failed', {
        context: { conversationId, code: completionErr?.code },
      })
      return
    }

    const profileIds = [completion.initiator_profile_id, completion.recipient_profile_id]
    const { data: profiles, error: profilesErr } = await admin
      .from('profiles')
      .select('id, display_name, username')
      .in('id', profileIds)

    if (profilesErr || !profiles || profiles.length < 2) {
      log.warn('trade completion prompt profile lookup failed', {
        context: { conversationId, code: profilesErr?.code },
      })
      return
    }

    const byId = new Map(profiles.map((profile) => [profile.id, profile]))
    const initiator = byId.get(completion.initiator_profile_id)
    const recipient = byId.get(completion.recipient_profile_id)
    if (!initiator || !recipient) return

    const resend = new Resend(apiKey)
    const pairs = [
      {
        recipientProfileId: initiator.id,
        recipientDisplayName: initiator.display_name ?? initiator.username ?? 'there',
        otherDisplayName: recipient.display_name ?? recipient.username ?? 'your trading partner',
      },
      {
        recipientProfileId: recipient.id,
        recipientDisplayName: recipient.display_name ?? recipient.username ?? 'there',
        otherDisplayName: initiator.display_name ?? initiator.username ?? 'your trading partner',
      },
    ]

    await Promise.all(pairs.map(async (pair) => {
      const { data: email } = await admin.rpc('profile_owner_email', {
        p_profile_id: pair.recipientProfileId,
      })
      if (!email) return

      await resend.emails.send({
        from: 'Barterkin <hello@barterkin.com>',
        to: [email],
        subject: `How did your trade with ${pair.otherDisplayName} go?`,
        react: TradeReviewRequestEmail({
          recipientDisplayName: pair.recipientDisplayName,
          otherDisplayName: pair.otherDisplayName,
          reviewUrl: `${siteUrl}/dashboard/messages/${conversationId}`,
          siteUrl,
        }),
      })
    }))
  } catch (error) {
    log.error('trade review prompt send failed', {
      error,
      context: { conversationId },
    })
  }
}

export async function markTradeComplete(
  _prev: MarkTradeCompleteResult | null,
  formData: FormData,
): Promise<MarkTradeCompleteResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'Not authenticated.' }

  const conversationId = String(formData.get('conversationId') ?? '')
  if (!conversationId) return { ok: false, error: 'Conversation ID is required.' }

  // Get sender profile id
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (profileErr || !profile) {
    return { ok: false, error: 'Profile not found.' }
  }

  // Verify participant
  const { data: participant, error: partErr } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('profile_id', profile.id)
    .maybeSingle()
  if (partErr || !participant) {
    return { ok: false, error: 'You are not a participant in this conversation.' }
  }

  // Call the idempotent RPC
  const { data: rpcResult, error: rpcErr } = await supabase.rpc(
    'mark_trade_complete',
    {
      p_conversation_id: conversationId,
      p_profile_id: profile.id,
    },
  )

  if (rpcErr) {
    const log = createLogger('trade-completions')
    log.error('mark_trade_complete RPC failed', {
      error: rpcErr,
      context: { code: rpcErr.code, conversationId },
    })
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }

  const row = (rpcResult as { status: string; completed_at: string | null }[] | null)?.[0]
  if (!row) {
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }

  revalidatePath(`/dashboard/messages/${conversationId}`)

  void captureEvent(user.id, 'trade_marked_complete', {
    conversation_id: conversationId,
    status: row.status,
  })

  if (row.status === 'completed') {
    void captureEvent(user.id, 'trade_mutually_completed', {
      conversation_id: conversationId,
    })
    void captureEvent(user.id, 'trade_completion_rate', {
      conversation_id: conversationId,
      listing_id: null,
      completed: true,
    })

    const questResult = await awardQuest('quest_first_trade')
    if (!questResult.ok && questResult.error !== 'Quest requirements not met yet.') {
      const log = createLogger('trade-completions')
      log.warn('quest_first_trade award failed', {
        context: { conversationId, error: questResult.error },
      })
    }
    if (questResult.ok && questResult.awarded) {
      void captureEvent(user.id, 'first_trade_completed', {
        conversation_id: conversationId,
        credits: questResult.credits,
      })
    }

    await sendTradeReviewPrompts(conversationId)
  }

  return {
    ok: true,
    status: row.status,
    completedAt: row.completed_at,
  }
}

export async function submitTradeReview(
  _prev: SubmitTradeReviewResult | null,
  formData: FormData,
): Promise<SubmitTradeReviewResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'Not authenticated.' }

  const conversationId = String(formData.get('conversationId') ?? '')
  if (!conversationId) return { ok: false, error: 'Conversation ID is required.' }

  const parsed = validateAndSanitize(RatingSchema, {
    rateeProfileId: formData.get('rateeProfileId'),
    listingId: formData.get('listingId') || undefined,
    score: Number(formData.get('score')),
    reviewText: formData.get('reviewText') ?? '',
  })
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    }
  }
  const values = parsed.data

  // Get rater profile id
  const { data: raterProfile, error: raterErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (raterErr || !raterProfile) {
    return { ok: false, error: 'Profile not found.' }
  }

  // Self-rating guard
  if (raterProfile.id === values.rateeProfileId) {
    return { ok: false, error: "You can't rate yourself." }
  }

  // Verify trade is mutually completed
  const { data: tradeCompletion, error: tcErr } = await supabase
    .from('trade_completions')
    .select('status')
    .eq('conversation_id', conversationId)
    .maybeSingle()
  if (tcErr) {
    const log = createLogger('trade-completions')
    log.error('trade completion lookup failed', {
      error: tcErr,
      context: { code: tcErr.code, conversationId },
    })
    return { ok: false, error: 'Something went wrong.' }
  }
  if (!tradeCompletion || tradeCompletion.status !== 'completed') {
    return { ok: false, error: 'Trade must be mutually completed before leaving a review.' }
  }

  // Verify rater is a participant in the conversation
  const { data: participant, error: partErr } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('profile_id', raterProfile.id)
    .maybeSingle()
  if (partErr || !participant) {
    return { ok: false, error: 'You are not a participant in this conversation.' }
  }

  // Check for existing rating on this conversation
  const { data: existing, error: existingErr } = await supabase
    .from('ratings')
    .select('id')
    .eq('rater_profile_id', raterProfile.id)
    .eq('ratee_profile_id', values.rateeProfileId)
    .eq('conversation_id', conversationId)
    .maybeSingle()
  if (existingErr) {
    const log = createLogger('trade-completions')
    log.error('existing rating check failed', {
      error: existingErr,
      context: { code: existingErr.code },
    })
    return { ok: false, error: 'Something went wrong.' }
  }
  if (existing) {
    return { ok: false, error: 'You have already reviewed this trade.' }
  }

  const { error: insertErr } = await supabase.from('ratings').insert({
    rater_profile_id: raterProfile.id,
    ratee_profile_id: values.rateeProfileId,
    conversation_id: conversationId,
    listing_id: values.listingId ?? null,
    score: values.score,
    review_text: values.reviewText && values.reviewText.trim() !== '' ? values.reviewText.trim() : null,
  })

  if (insertErr) {
    const log = createLogger('trade-completions')
    log.error('submitTradeReview insert failed', {
      error: insertErr,
      context: { code: insertErr.code },
    })
    return { ok: false, error: 'Something went wrong submitting your review.' }
  }

  revalidatePath(`/m/${values.rateeProfileId}`)
  revalidatePath('/dashboard/reviews')
  revalidatePath(`/dashboard/messages/${conversationId}`)

  void captureEvent(user.id, 'trade_review_submitted', {
    conversation_id: conversationId,
    ratee_profile_id: values.rateeProfileId,
    listing_id: values.listingId ?? null,
    score: values.score,
  })

  return { ok: true }
}
