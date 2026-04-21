/**
 * TRUST-07 — contact_eligibility RPC unit tests
 *
 * Tests the `public.contact_eligibility(p_sender_owner_id, p_recipient_profile_id)` SECURITY DEFINER
 * RPC introduced in migration 005. Verifies all 5 rejection conditions (sender banned, recipient banned,
 * recipient not accepting, blocked by recipient, blocked by sender) plus the happy path.
 *
 * Requirement coverage:
 *   TRUST-07 — Edge Function rejects all 5 ineligibility conditions via RPC flags
 *   CONT-04  — contact_eligibility returns sender_profile_id + recipient_email when eligible
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasAll = Boolean(URL && ANON && SERVICE)
const d = hasAll ? describe : describe.skip

d('TRUST-07 — contact_eligibility RPC', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let admin: any
  const userIds: string[] = []
  const profileRefs: Record<string, { ownerId: string; profileId: string }> = {}

  async function createUserAndProfile(
    key: string,
    opts: { banned?: boolean; accepting_contact?: boolean } = {}
  ): Promise<{ ownerId: string; profileId: string }> {
    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email: `elig-${key}-${Date.now()}@test.local`,
      email_confirm: true,
      password: 'test-only-password-12345',
    })
    if (userErr || !userData.user) throw userErr ?? new Error('user create failed')
    userIds.push(userData.user.id)

    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .insert({
        owner_id: userData.user.id,
        username: `elig_${key}_${Date.now()}`.slice(0, 40),
        display_name: `Test ${key}`,
        is_published: true,
        accepting_contact: opts.accepting_contact ?? true,
        banned: opts.banned ?? false,
        county_id: 13001, // Appling County — valid FIPS per 003 seed
        category_id: 1,   // Home & Garden — first seeded category
      })
      .select('id, owner_id')
      .single()
    if (profErr || !profile) throw profErr ?? new Error('profile create failed')
    // Add a skill so the profile satisfies the publish constraint
    await admin.from('skills_offered').insert({
      profile_id: profile.id,
      skill_text: 'eligibility-test-skill',
      sort_order: 0,
    })
    return { ownerId: profile.owner_id, profileId: profile.id }
  }

  beforeAll(async () => {
    admin = createSupabaseClient(URL!, SERVICE!, { auth: { persistSession: false, autoRefreshToken: false } })
    profileRefs.sender = await createUserAndProfile('sender')
    profileRefs.recipient = await createUserAndProfile('recipient')
    profileRefs.bannedSender = await createUserAndProfile('bannedSender', { banned: true })
    profileRefs.bannedRecipient = await createUserAndProfile('bannedRecipient', { banned: true })
    profileRefs.notAccepting = await createUserAndProfile('notAccepting', { accepting_contact: false })
  }, 60_000)

  afterAll(async () => {
    for (const id of userIds) await admin.auth.admin.deleteUser(id)
  }, 60_000)

  it('happy path: all flags false, profile IDs populated, recipient email present', async () => {
    const { data, error } = await admin
      .rpc('contact_eligibility', {
        p_sender_owner_id: profileRefs.sender.ownerId,
        p_recipient_profile_id: profileRefs.recipient.profileId,
      })
      .single()
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.sender_banned).toBe(false)
    expect(data!.recipient_banned).toBe(false)
    expect(data!.accepting_contact).toBe(true)
    expect(data!.blocked_by_recipient).toBe(false)
    expect(data!.blocked_by_sender).toBe(false)
    expect(data!.sender_profile_id).toBe(profileRefs.sender.profileId)
    expect(data!.recipient_email).toMatch(/@test\.local$/)
  })

  it('rejects banned sender (sender_banned = true)', async () => {
    const { data, error } = await admin
      .rpc('contact_eligibility', {
        p_sender_owner_id: profileRefs.bannedSender.ownerId,
        p_recipient_profile_id: profileRefs.recipient.profileId,
      })
      .single()
    expect(error).toBeNull()
    expect(data!.sender_banned).toBe(true)
  })

  it('rejects banned recipient (recipient_banned = true)', async () => {
    const { data, error } = await admin
      .rpc('contact_eligibility', {
        p_sender_owner_id: profileRefs.sender.ownerId,
        p_recipient_profile_id: profileRefs.bannedRecipient.profileId,
      })
      .single()
    expect(error).toBeNull()
    expect(data!.recipient_banned).toBe(true)
  })

  it('rejects when recipient has accepting_contact = false', async () => {
    const { data, error } = await admin
      .rpc('contact_eligibility', {
        p_sender_owner_id: profileRefs.sender.ownerId,
        p_recipient_profile_id: profileRefs.notAccepting.profileId,
      })
      .single()
    expect(error).toBeNull()
    expect(data!.accepting_contact).toBe(false)
  })

  it('rejects when recipient has blocked sender (blocked_by_recipient = true)', async () => {
    // recipient blocks sender
    await admin.from('blocks').insert({
      blocker_id: profileRefs.recipient.ownerId,
      blocked_id: profileRefs.sender.ownerId,
    })
    const { data, error } = await admin
      .rpc('contact_eligibility', {
        p_sender_owner_id: profileRefs.sender.ownerId,
        p_recipient_profile_id: profileRefs.recipient.profileId,
      })
      .single()
    expect(error).toBeNull()
    expect(data!.blocked_by_recipient).toBe(true)
    // Cleanup
    await admin.from('blocks').delete().match({
      blocker_id: profileRefs.recipient.ownerId,
      blocked_id: profileRefs.sender.ownerId,
    })
  })

  it('rejects when sender has blocked recipient (blocked_by_sender = true)', async () => {
    // sender blocks recipient
    await admin.from('blocks').insert({
      blocker_id: profileRefs.sender.ownerId,
      blocked_id: profileRefs.recipient.ownerId,
    })
    const { data, error } = await admin
      .rpc('contact_eligibility', {
        p_sender_owner_id: profileRefs.sender.ownerId,
        p_recipient_profile_id: profileRefs.recipient.profileId,
      })
      .single()
    expect(error).toBeNull()
    expect(data!.blocked_by_sender).toBe(true)
    // Cleanup
    await admin.from('blocks').delete().match({
      blocker_id: profileRefs.sender.ownerId,
      blocked_id: profileRefs.recipient.ownerId,
    })
  })
})
