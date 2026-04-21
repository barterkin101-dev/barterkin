/**
 * SEED-03 — founding-member seed script integration tests.
 *
 * Env-gated: describes run only when NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are present. Pattern mirrors
 * tests/unit/contact-eligibility.test.ts.
 *
 * Test bodies are stubbed with todo markers in Wave 0 (Plan 01). Plan 02
 * implements the seed script and fills these in.
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
  const testEmail = `seed-test-${Date.now()}@test.local`

  beforeAll(async () => {
    admin = createSupabaseClient(URL!, SERVICE!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }, 30_000)

  afterAll(async () => {
    // Cleanup: delete test user if it was created. Cascades to profiles + skills via FK.
    if (!admin) return
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const user = data?.users?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (u: any) => u.email?.toLowerCase() === testEmail.toLowerCase(),
    )
    if (user) await admin.auth.admin.deleteUser(user.id)
  }, 30_000)

  it.todo('seeds a founding member: creates auth user with email_confirm=true, inserts profile with founding_member=true + is_published=true, inserts skills_offered rows')

  it.todo('is idempotent: second invocation with the same email skips (does not create duplicate auth user or profile)')
})
