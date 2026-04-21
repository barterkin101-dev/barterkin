/**
 * Phase 4 — E2E seed helpers for directory tests
 *
 * Uses the Supabase admin client (service-role key) to:
 *  - Create verified auth users
 *  - Seed published profiles with skills
 *  - Clean up after each test suite
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const admin = () =>
  createClient(URL, SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export async function createVerifiedUser(
  email: string,
  password: string,
): Promise<string> {
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw new Error(`createVerifiedUser failed: ${error.message}`)
  return data.user!.id
}

export async function seedPublishedProfile(opts: {
  ownerId: string
  display_name: string
  county_id?: number
  category_id?: number
  skills?: string[]
  founding_member?: boolean  // NEW — defaults to false
}): Promise<string> {
  const username = `${opts.display_name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`.slice(
    0,
    40,
  )
  const { data, error } = await admin()
    .from('profiles')
    .insert({
      owner_id: opts.ownerId,
      display_name: opts.display_name,
      username,
      county_id: opts.county_id ?? 13001, // Appling County
      category_id: opts.category_id ?? 1,
      is_published: true,
      banned: false,
      founding_member: opts.founding_member ?? false,
    })
    .select('id')
    .single()

  if (error) throw new Error(`seedPublishedProfile failed: ${error.message}`)
  const id = data!.id

  if (opts.skills) {
    for (let i = 0; i < opts.skills.length; i++) {
      await admin()
        .from('skills_offered')
        .insert({ profile_id: id, skill_text: opts.skills[i], sort_order: i })
    }
  }

  return id
}

export async function cleanupUser(id: string): Promise<void> {
  // deleteUser cascades to profiles + skills via FK
  await admin().auth.admin.deleteUser(id)
}
