/**
 * Phase 4 — DIR-09 — RLS directory visibility contract
 *
 * Proves that Phase 3's RLS policy "Verified members see published non-banned profiles"
 * correctly hides unpublished / banned / unverified-owner profiles even from
 * authenticated-but-not-owner queries.
 *
 * Setup:
 *   - admin client seeds 4 profiles with different visibility states.
 *   - A separate authenticated "viewer" client (email-verified, non-banned) runs
 *     the SELECT. RLS must filter it down to only the "valid" profile.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasAll = Boolean(URL && ANON && SERVICE)

const d = hasAll ? describe : describe.skip

d('DIR-09 — RLS directory visibility', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let admin: any
  const userIds: string[] = []
  const stamp = Date.now()
  let viewerJwt = ''
  let unpublishedId = ''
  let bannedId = ''
  let unverifiedOwnerProfileId = ''
  let validId = ''

  async function createUser(email: string, verified: boolean): Promise<string> {
    const { data } = await admin.auth.admin.createUser({
      email,
      email_confirm: verified,
      password: 'test-only-password-12345',
    })
    const id = data!.user!.id
    userIds.push(id)
    return id
  }

  async function seed(opts: {
    ownerId: string
    is_published: boolean
    banned: boolean
    display_name: string
  }): Promise<string> {
    const { data } = await admin
      .from('profiles')
      .insert({
        owner_id: opts.ownerId,
        display_name: opts.display_name,
        username: `${opts.display_name.toLowerCase().replace(/\s+/g, '-')}-${stamp}`.slice(0, 40),
        county_id: 13001,
        category_id: 1,
        is_published: opts.is_published,
        banned: opts.banned,
      })
      .select('id')
      .single()
    const id = data!.id as string
    // Seed at least one skill so the profile is "publish-eligible"
    await admin.from('skills_offered').insert({
      profile_id: id,
      skill_text: 'rls-test-skill',
      sort_order: 0,
    })
    return id
  }

  beforeAll(async () => {
    const mod = await import('@/lib/supabase/admin')
    admin = mod.supabaseAdmin

    // Create a verified viewer and capture its access token
    const viewerEmail = `rls-viewer-${stamp}@example.test`
    const viewerId = await createUser(viewerEmail, true)
    void viewerId // used for cleanup via userIds array
    // Sign in to get a JWT
    const client = createSupabaseClient(URL!, ANON!)
    const { data: session } = await client.auth.signInWithPassword({
      email: viewerEmail,
      password: 'test-only-password-12345',
    })
    viewerJwt = session.session?.access_token ?? ''
    expect(viewerJwt).not.toBe('')

    // Seed 4 profiles
    const unpublishedOwner = await createUser(`rls-unpub-${stamp}@example.test`, true)
    unpublishedId = await seed({
      ownerId: unpublishedOwner,
      is_published: false,
      banned: false,
      display_name: 'Unpublished',
    })

    const bannedOwner = await createUser(`rls-ban-${stamp}@example.test`, true)
    bannedId = await seed({
      ownerId: bannedOwner,
      is_published: true,
      banned: true,
      display_name: 'Banned',
    })

    const unverifiedOwner = await createUser(`rls-unver-${stamp}@example.test`, false)
    unverifiedOwnerProfileId = await seed({
      ownerId: unverifiedOwner,
      is_published: true,
      banned: false,
      display_name: 'UnverifiedOwner',
    })

    const validOwner = await createUser(`rls-valid-${stamp}@example.test`, true)
    validId = await seed({
      ownerId: validOwner,
      is_published: true,
      banned: false,
      display_name: 'Valid',
    })
  }, 60_000)

  afterAll(async () => {
    for (const id of userIds) await admin.auth.admin.deleteUser(id)
  }, 60_000)

  function viewerClient() {
    return createSupabaseClient(URL!, ANON!, {
      global: { headers: { Authorization: `Bearer ${viewerJwt}` } },
    })
  }

  it('excludes profiles where is_published = false', async () => {
    const { data } = await viewerClient()
      .from('profiles')
      .select('id')
      .eq('id', unpublishedId)
    expect(data ?? []).toHaveLength(0)
  })

  it('excludes profiles where banned = true', async () => {
    const { data } = await viewerClient()
      .from('profiles')
      .select('id')
      .eq('id', bannedId)
    expect(data ?? []).toHaveLength(0)
  })

  it('excludes profiles whose owner is email-unverified', async () => {
    const { data } = await viewerClient()
      .from('profiles')
      .select('id')
      .eq('id', unverifiedOwnerProfileId)
    expect(data ?? []).toHaveLength(0)
  })

  it('includes profiles that are published + verified + not-banned', async () => {
    const { data } = await viewerClient()
      .from('profiles')
      .select('id')
      .eq('id', validId)
    expect(data ?? []).toHaveLength(1)
  })
})
