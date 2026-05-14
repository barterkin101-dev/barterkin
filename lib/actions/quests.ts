'use server'

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'
import { captureEvent } from '@/lib/analytics'
import { QUESTS, isUtcDateToday, type QuestKey, type QuestDef, type QuestStatus } from '@/lib/quests'

const log = createLogger('quests')

export interface GetQuestsResult {
  ok: boolean
  quests?: QuestStatus[]
  streak?: number
  credits?: number
  error?: string
}

export async function getQuestStatus(): Promise<GetQuestsResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return { ok: false, error: 'Not authenticated.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, credits, login_streak, last_login_at')
    .eq('owner_id', user.id)
    .single()

  if (!profile) {
    return { ok: false, error: 'Profile not found.' }
  }

  const { data: completions } = await supabase
    .from('quest_completions')
    .select('quest_key')
    .eq('profile_id', profile.id)

  const { count: convertedReferralCount } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('inviter_id', profile.id)
    .not('credited_at', 'is', null)

  const completedSet = new Set((completions ?? []).map((c) => c.quest_key))
  if (isUtcDateToday(profile.last_login_at)) {
    completedSet.add('quest_daily_login')
  }
  if ((convertedReferralCount ?? 0) > 0) {
    completedSet.add('quest_referral_converted')
  }

  const quests: QuestStatus[] = QUESTS.map((q) => ({
    key: q.key,
    completed: completedSet.has(q.key),
    credits: q.credits,
  }))

  return {
    ok: true,
    quests,
    streak: profile.login_streak ?? 0,
    credits: profile.credits ?? 0,
  }
}

export interface AwardQuestResult {
  ok: boolean
  awarded?: boolean
  credits?: number
  error?: string
}

/**
 * Award a quest credit idempotently.
 * Returns { awarded: true } if this was the first time awarding this quest.
 */
export async function awardQuest(
  questKey: QuestKey,
): Promise<AwardQuestResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return { ok: false, error: 'Not authenticated.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, credits')
    .eq('owner_id', user.id)
    .single()

  if (!profile) {
    return { ok: false, error: 'Profile not found.' }
  }

  const quest = QUESTS.find((q) => q.key === questKey)
  if (!quest) {
    return { ok: false, error: 'Invalid quest.' }
  }
  if (questKey === 'quest_daily_login') {
    return { ok: false, error: 'Daily login rewards are awarded automatically.' }
  }

  const eligible = await isQuestEligible(supabase, profile.id, quest)
  if (!eligible) {
    return { ok: false, error: 'Quest requirements not met yet.' }
  }

  try {
    const { data: awarded, error: rpcErr } = await supabase.rpc(
      'award_quest_credit',
      {
        p_profile_id: profile.id,
        p_quest_key: questKey,
        p_credits: quest.credits,
      },
    )

    if (rpcErr) throw rpcErr

    if (awarded) {
      captureEvent('quests', 'quest_completed', {
        quest_key: questKey,
        credits: quest.credits,
      }).catch(() => {})
    }

    return {
      ok: true,
      awarded: awarded ?? false,
      credits: profile.credits + (awarded ? quest.credits : 0),
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error('awardQuest failed', { context: { questKey, error: msg } })
    return { ok: false, error: 'Could not award quest. Please try again.' }
  }
}

export interface UpdateStreakResult {
  ok: boolean
  streak?: number
  creditsEarned?: number
  isNewDay?: boolean
  error?: string
}

/**
 * Update login streak on each login.
 * Called from middleware or auth callback after session is established.
 */
export async function updateLoginStreak(): Promise<UpdateStreakResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return { ok: false, error: 'Not authenticated.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) {
    return { ok: false, error: 'Profile not found.' }
  }

  try {
    const { data, error: rpcErr } = await supabase.rpc('update_login_streak', {
      p_profile_id: profile.id,
    })

    if (rpcErr) throw rpcErr

    const row = Array.isArray(data) ? data[0] : data
    const streak = row?.streak ?? 0
    const creditsEarned = row?.credits_earned ?? 0
    const isNewDay = row?.is_new_day ?? false

    if (isNewDay && creditsEarned > 0) {
      captureEvent('quests', 'quest_completed', {
        quest_key: 'quest_daily_login',
        credits: creditsEarned,
        streak,
      }).catch(() => {})
    }

    return { ok: true, streak, creditsEarned, isNewDay }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error('updateLoginStreak failed', { context: { error: msg } })
    return { ok: false, error: 'Could not update streak.' }
  }
}

async function isQuestEligible(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  quest: QuestDef,
): Promise<boolean> {
  switch (quest.key) {
    case 'quest_first_listing': {
      const { count, error } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
      return !error && (count ?? 0) > 0
    }
    case 'quest_complete_profile': {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, county_id, category_id, is_published, skills_offered(id)')
        .eq('id', profileId)
        .maybeSingle()
      if (error || !profile) return false

      return Boolean(
        profile.is_published
          && profile.display_name
          && profile.avatar_url
          && profile.county_id
          && profile.category_id
          && Array.isArray(profile.skills_offered)
          && profile.skills_offered.length > 0,
      )
    }
    case 'quest_first_message': {
      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_profile_id', profileId)
      return !error && (count ?? 0) > 0
    }
    case 'quest_referral_converted': {
      const { count, error } = await supabase
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('inviter_id', profileId)
        .not('credited_at', 'is', null)
      return !error && (count ?? 0) > 0
    }
    default:
      return false
  }
}
