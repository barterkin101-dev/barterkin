/**
 * Phase 4 — DIR-05 — Search-text trigger integration test
 *
 * Proves that migration 004's triggers keep profiles.search_text in sync with
 * display_name, bio, tiktok_handle, skills_offered, and skills_wanted changes.
 *
 * Uses the service-role (admin) client so we can bypass RLS during setup.
 * Tests run serially against the linked Supabase dev project.
 *
 * Note: lib/supabase/admin.ts exports `supabaseAdmin` (singleton, not a factory).
 * When SUPABASE_SERVICE_ROLE_KEY is absent, describe.skip is engaged.
 * Dynamic import avoids the eager supabaseUrl validation crash when env vars are missing.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Bail out in environments without service-role access (CI without secrets).
const hasAdmin = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const d = hasAdmin ? describe : describe.skip

d('DIR-05: search_text trigger integration', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let admin: any = null
  let userId = ''
  let profileId = ''

  beforeAll(async () => {
    // Lazy import to avoid eager supabaseUrl validation when env vars are absent
    const mod = await import('@/lib/supabase/admin')
    admin = mod.supabaseAdmin

    // 1. Create a throwaway auth user
    const email = `dir-search-trigger-${Date.now()}@example.test`
    const { data: user, error: userErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: 'test-only-password-12345',
    })
    if (userErr || !user?.user) throw userErr ?? new Error('no user')
    userId = user.user.id

    // 2. Insert a minimal profile (counties.id 13001 = Appling County, categories.id 1 = Home & Garden)
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .insert({
        owner_id: userId,
        display_name: 'Trigger Testy',
        bio: 'A test bio',
        tiktok_handle: '@triggertesty',
        county_id: 13001,
        category_id: 1,
        is_published: false,
        banned: false,
      })
      .select('id')
      .single()
    if (profileErr || !profile) throw profileErr ?? new Error('no profile')
    profileId = profile.id
  })

  afterAll(async () => {
    if (userId && admin) await admin.auth.admin.deleteUser(userId)
  })

  it('Test 1: inserting a skills_offered row appends to search_text', async () => {
    await admin.from('skills_offered').insert({
      profile_id: profileId,
      skill_text: 'woodworking',
      sort_order: 0,
    })
    const { data } = await admin
      .from('profiles')
      .select('search_text')
      .eq('id', profileId)
      .single()
    expect(data?.search_text ?? '').toContain('woodworking')
    expect(data?.search_text ?? '').toContain('Trigger Testy')
    expect(data?.search_text ?? '').toContain('@triggertesty')
  })

  it('Test 2: updating display_name updates search_text', async () => {
    await admin
      .from('profiles')
      .update({ display_name: 'Renamed Testy' })
      .eq('id', profileId)
    const { data } = await admin
      .from('profiles')
      .select('search_text')
      .eq('id', profileId)
      .single()
    expect(data?.search_text ?? '').toContain('Renamed Testy')
    expect(data?.search_text ?? '').not.toContain('Trigger Testy')
  })

  it('Test 3: deleting a skills_offered row removes its text from search_text', async () => {
    await admin
      .from('skills_offered')
      .delete()
      .eq('profile_id', profileId)
      .eq('skill_text', 'woodworking')
    const { data } = await admin
      .from('profiles')
      .select('search_text')
      .eq('id', profileId)
      .single()
    expect(data?.search_text ?? '').not.toContain('woodworking')
  })

  it('Test 4: inserting a skills_wanted row appends to search_text', async () => {
    await admin.from('skills_wanted').insert({
      profile_id: profileId,
      skill_text: 'baking',
      sort_order: 0,
    })
    const { data } = await admin
      .from('profiles')
      .select('search_text')
      .eq('id', profileId)
      .single()
    expect(data?.search_text ?? '').toContain('baking')
  })
})
