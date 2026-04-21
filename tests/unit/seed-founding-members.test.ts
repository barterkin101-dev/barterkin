/**
 * SEED-03 — founding-member seed script integration tests.
 *
 * Env-gated: describes run only when NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are present. Pattern mirrors
 * tests/unit/contact-eligibility.test.ts.
 *
 * Plan 02 fills in the two real test bodies (happy-path + idempotency)
 * using the helpers exported from scripts/seed-founding-members.mjs.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasAll = Boolean(URL && SERVICE)
const d = hasAll ? describe : describe.skip

d('SEED-03 — seed-founding-members', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let admin: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let seedOneMember: (adminClient: any, m: any) => Promise<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let emailExists: (adminClient: any, email: string) => Promise<boolean>
  const createdEmails: string[] = []

  beforeAll(async () => {
    admin = createSupabaseClient(URL!, SERVICE!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    // Relative to tests/unit/ -> ../../scripts/seed-founding-members.mjs
    // Hoisted into beforeAll to avoid top-level await restrictions in the
    // vitest jsdom environment.
    const seedModule = await import('../../scripts/seed-founding-members.mjs')
    seedOneMember = seedModule.seedOneMember
    emailExists = seedModule.emailExists
  }, 30_000)

  afterAll(async () => {
    // Cleanup: delete any test users created during the run. Cascades to
    // profiles + skills via FK.
    if (!admin) return
    for (const email of createdEmails) {
      const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const user = data?.users?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (u: any) => u.email?.toLowerCase() === email.toLowerCase(),
      )
      if (user) await admin.auth.admin.deleteUser(user.id)
    }
  }, 60_000)

  it('seeds a founding member: creates auth user + profile + skills (happy-path)', async () => {
    const stamp = Date.now()
    const email = `seed-test-happy-${stamp}@test.local`
    createdEmails.push(email)

    const member = {
      email,
      display_name: `Happy Seed ${stamp}`,
      bio: 'Test bio',
      county_id: 13001, // Appling
      category_id: 1,
      skills_offered: ['Widget wrangling', 'Test maintenance'],
      skills_wanted: [],
      tiktok_handle: null,
      availability: null,
      accepting_contact: true,
      avatar_url: null,
    }

    const result = await seedOneMember(admin, member)

    expect(result.status).toBe('seeded')
    expect(result.authUserId).toBeTruthy()
    expect(result.profileId).toBeTruthy()
    expect(result.username).toMatch(/^happy-seed/)

    // Assert auth user is email_confirmed
    const { data: userData } = await admin.auth.admin.getUserById(result.authUserId)
    expect(userData?.user?.email).toBe(email)
    expect(userData?.user?.email_confirmed_at).not.toBeNull()

    // Assert profile has founding_member=true, is_published=true
    const { data: profile } = await admin
      .from('profiles')
      .select('founding_member, is_published, owner_id, display_name')
      .eq('id', result.profileId)
      .single()
    expect(profile?.founding_member).toBe(true)
    expect(profile?.is_published).toBe(true)
    expect(profile?.owner_id).toBe(result.authUserId)
    expect(profile?.display_name).toBe(member.display_name)

    // Assert skills_offered inserted
    const { data: skills } = await admin
      .from('skills_offered')
      .select('skill_text, sort_order')
      .eq('profile_id', result.profileId)
      .order('sort_order')
    expect(skills?.length).toBe(2)
    expect(skills?.[0]?.skill_text).toBe('Widget wrangling')
    expect(skills?.[1]?.skill_text).toBe('Test maintenance')
  }, 60_000)

  it('is idempotent: second invocation with same email returns skipped (no duplicate auth user)', async () => {
    const stamp = Date.now()
    const email = `seed-test-idem-${stamp}@test.local`
    createdEmails.push(email)

    const member = {
      email,
      display_name: `Idem Seed ${stamp}`,
      county_id: 13001,
      category_id: 1,
      skills_offered: ['one skill'],
      skills_wanted: [],
      accepting_contact: true,
    }

    const first = await seedOneMember(admin, member)
    expect(first.status).toBe('seeded')

    const second = await seedOneMember(admin, member)
    expect(second.status).toBe('skipped')
    expect(second.reason).toBe('email_exists')

    // Assert only ONE auth user exists for this email (no duplicate)
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const matches = data.users.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (u: any) => u.email?.toLowerCase() === email.toLowerCase(),
    )
    expect(matches.length).toBe(1)

    // Assert only ONE profile exists for this owner
    const { count } = await admin
      .from('profiles')
      .select('id', { head: true, count: 'exact' })
      .eq('owner_id', first.authUserId)
    expect(count).toBe(1)

    // Confirm emailExists agrees
    const exists = await emailExists(admin, email)
    expect(exists).toBe(true)
  }, 60_000)
})
