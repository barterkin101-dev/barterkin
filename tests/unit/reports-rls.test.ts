/**
 * TRUST-05 — reports table RLS opacity tests
 *
 * Proves that the `reports` table RLS policy prevents authenticated users from reading
 * any report rows (including their own submissions). Only service-role bypasses RLS.
 *
 * Requirement coverage:
 *   TRUST-05 — reports table scaffolded day-one; reporter identity visible only to service-role
 *   TRUST-01 — reason enum check enforced at DB level
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasAll = Boolean(URL && ANON && SERVICE)
const d = hasAll ? describe : describe.skip

d('TRUST-05 — reports table RLS', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let admin: any
  const userIds: string[] = []
  const stamp = Date.now()
  let reporterJwt = ''
  let reporterUserId = ''
  let targetProfileId = ''
  let otherUserId = ''

  beforeAll(async () => {
    admin = createSupabaseClient(URL!, SERVICE!, { auth: { persistSession: false, autoRefreshToken: false } })

    // Create reporter user (email-verified)
    const reporterEmail = `reports-reporter-${stamp}@example.test`
    const { data: reporterData } = await admin.auth.admin.createUser({
      email: reporterEmail,
      email_confirm: true,
      password: 'test-only-password-12345',
    })
    reporterUserId = reporterData!.user!.id
    userIds.push(reporterUserId)

    // Create target user + profile
    const targetEmail = `reports-target-${stamp}@example.test`
    const { data: targetData } = await admin.auth.admin.createUser({
      email: targetEmail,
      email_confirm: true,
      password: 'test-only-password-12345',
    })
    const targetUserId = targetData!.user!.id
    userIds.push(targetUserId)

    // Create an "other" user for cross-user insert test
    const otherEmail = `reports-other-${stamp}@example.test`
    const { data: otherData } = await admin.auth.admin.createUser({
      email: otherEmail,
      email_confirm: true,
      password: 'test-only-password-12345',
    })
    otherUserId = otherData!.user!.id
    userIds.push(otherUserId)

    // Create reporter profile
    await admin
      .from('profiles')
      .insert({
        owner_id: reporterUserId,
        username: `reporter-${stamp}`.slice(0, 40),
        display_name: 'Reporter',
        is_published: false,
        county_id: 13001,
        category_id: 1,
      })

    // Create target profile (for report target_profile_id)
    const { data: tp } = await admin
      .from('profiles')
      .insert({
        owner_id: targetUserId,
        username: `target-${stamp}`.slice(0, 40),
        display_name: 'Target',
        is_published: true,
        county_id: 13001,
        category_id: 1,
      })
      .select('id')
      .single()
    targetProfileId = tp!.id
    // Seed skill so target profile satisfies publish constraint
    await admin.from('skills_offered').insert({
      profile_id: targetProfileId,
      skill_text: 'reports-rls-test-skill',
      sort_order: 0,
    })

    // Sign in as reporter to get a JWT.
    // This project uses magic-link (no password auth), so we use generateLink + verifyOtp
    // to exchange for a real session token without going through email delivery.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: reporterEmail,
    })
    if (linkErr || !linkData?.properties?.email_otp) throw linkErr ?? new Error('generateLink failed')
    const anonClient = createSupabaseClient(URL!, ANON!)
    const { data: sessionData, error: sessionErr } = await anonClient.auth.verifyOtp({
      email: reporterEmail,
      token: linkData.properties.email_otp,
      type: 'magiclink',
    })
    if (sessionErr) throw sessionErr
    reporterJwt = sessionData.session?.access_token ?? ''
    expect(reporterJwt).not.toBe('')
  }, 60_000)

  afterAll(async () => {
    for (const id of userIds) await admin.auth.admin.deleteUser(id)
  }, 60_000)

  function reporterClient() {
    return createSupabaseClient(URL!, ANON!, {
      global: { headers: { Authorization: `Bearer ${reporterJwt}` } },
    })
  }

  it('service-role can INSERT a report and SELECT it back', async () => {
    const { error: insertErr } = await admin.from('reports').insert({
      reporter_id: reporterUserId,
      target_profile_id: targetProfileId,
      reason: 'spam',
    })
    expect(insertErr).toBeNull()

    const { data, error: selectErr } = await admin
      .from('reports')
      .select('id, reason')
      .eq('target_profile_id', targetProfileId)
    expect(selectErr).toBeNull()
    expect((data ?? []).length).toBeGreaterThanOrEqual(1)
  })

  it('authenticated user SELECT returns 0 rows (RLS blocks read — TRUST-05 opacity)', async () => {
    const { data, error } = await reporterClient()
      .from('reports')
      .select('id')
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(0)
  })

  it('authenticated user cannot SELECT their own submitted reports', async () => {
    // Even the reporter who submitted cannot read the report back
    const { data, error } = await reporterClient()
      .from('reports')
      .select('id')
      .eq('reporter_id', reporterUserId)
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(0)
  })

  it('authenticated user CAN insert a report with their own reporter_id and valid reason', async () => {
    const { error } = await reporterClient()
      .from('reports')
      .insert({
        reporter_id: reporterUserId,
        target_profile_id: targetProfileId,
        reason: 'harassment',
      })
    expect(error).toBeNull()
  })

  it('authenticated user cannot insert report with reporter_id != auth.uid() (RLS WITH CHECK)', async () => {
    // Try to submit a report impersonating otherUserId
    const { error } = await reporterClient()
      .from('reports')
      .insert({
        reporter_id: otherUserId, // not the JWT user
        target_profile_id: targetProfileId,
        reason: 'spam',
      })
    expect(error).not.toBeNull()
    // RLS WITH CHECK violation — code 42501 or message includes row-level security
    const isRlsError =
      error!.code === '42501' ||
      error!.message.toLowerCase().includes('row-level security') ||
      error!.message.toLowerCase().includes('violates')
    expect(isRlsError).toBe(true)
  })

  it('rejects report with invalid reason enum value (CHECK constraint error 23514)', async () => {
    const { error } = await admin.from('reports').insert({
      reporter_id: reporterUserId,
      target_profile_id: targetProfileId,
      reason: 'invalid-reason', // intentionally invalid enum value to test DB CHECK constraint
    })
    expect(error).not.toBeNull()
    // Postgres CHECK violation: error code 23514
    expect(error!.code).toBe('23514')
  })
})
