#!/usr/bin/env node
/**
 * scripts/seed-founding-members.mjs — SEED-03
 *
 * Idempotent admin seed script for Phase 7 founding members.
 *
 * Run: node --env-file=.env.local scripts/seed-founding-members.mjs
 * Past cutoff: node --env-file=.env.local scripts/seed-founding-members.mjs --force
 *
 * Pattern: scripts/seed-georgia-counties.mjs (script shell)
 *          + scripts/send-mailtest.mjs (Resend fetch)
 *          + tests/e2e/fixtures/directory-seed.ts (admin client + auth.admin.createUser)
 *
 * Pitfall 1 (07-RESEARCH.md): `auth.admin` lookup-by-email helper does NOT exist in
 * @supabase/supabase-js@2.103.3. We use listUsers() + in-memory filter.
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND = process.env.RESEND_API_KEY

if (!URL || !SERVICE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!RESEND) {
  console.warn('RESEND_API_KEY missing — welcome emails will be skipped')
}

const CUTOFF_DATE = new Date('2026-06-01')
if (new Date() > CUTOFF_DATE && !process.argv.includes('--force')) {
  console.error(
    `Past pre-launch cutoff (${CUTOFF_DATE.toISOString().slice(0, 10)}). ` +
    `Use --force to override.`,
  )
  process.exit(1)
}

// D-06: hardcoded array; fill in from Google Sheet responses after outreach (Plan 04).
// Shape per-member:
//   { email, display_name, bio, county_id, category_id, avatar_url, skills_offered[], skills_wanted[], tiktok_handle, availability, accepting_contact }
// county_id = Georgia FIPS (5-digit: 13001..13321; counties.id = fips per Phase 3 D-01)
// category_id = 1..10 (see lib/data/categories.ts)
const members = [
  // Example entry (commented — replace with real Google Form responses):
  // {
  //   email: 'kerry@example.com',
  //   display_name: "Kerry's Country Life",
  //   bio: 'Herbal syrups, tinctures, and country living knowledge.',
  //   county_id: 13223, // Paulding (Dallas)
  //   category_id: 9,   // Outdoors & Animals
  //   avatar_url: null,
  //   skills_offered: ['Herbal syrups', 'Tinctures', 'Homesteading advice'],
  //   skills_wanted: [],
  //   tiktok_handle: '@kerryscountrylife',
  //   availability: null,
  //   accepting_contact: true,
  // },
]

const admin = createClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Inline copy of lib/utils/slug.ts:generateSlug — avoids TS/ESM interop.
export function generateSlug(displayName) {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
}

// Pitfall 1: listUsers + in-memory filter. A direct lookup-by-email helper DOES NOT EXIST.
export async function emailExists(adminClient, email) {
  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  return data.users.some((u) => u.email?.toLowerCase() === email.toLowerCase())
}

// Mirror lib/actions/profile.ts:resolveUniqueSlug retry loop
export async function resolveUniqueUsername(adminClient, base) {
  const safeBase = base || 'member'
  const candidates = [
    safeBase,
    ...Array.from({ length: 8 }, (_, i) => `${safeBase}-${i + 2}`),
    `${safeBase}-${randomUUID().slice(0, 8)}`,
  ]
  for (const c of candidates) {
    const { count, error } = await adminClient
      .from('profiles')
      .select('id', { head: true, count: 'exact' })
      .eq('username', c)
    if (error) throw error
    if ((count ?? 0) === 0) return c
  }
  return candidates.at(-1) // fallback: uuid-suffixed candidate
}

// Pitfall 2: service-role bypasses PROF-12 completeness gate — validate in JS.
export function validateMember(m) {
  const errors = []
  if (!m.email) errors.push('email required')
  if (!m.display_name) errors.push('display_name required')
  if (!m.county_id) errors.push('county_id required')
  if (!m.category_id) errors.push('category_id required')
  if (!Array.isArray(m.skills_offered) || m.skills_offered.length === 0) {
    errors.push('skills_offered must contain at least one skill')
  }
  return errors
}

export async function sendWelcomeEmail(email, displayName, username) {
  if (!RESEND) return { skipped: true }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Barterkin <hello@barterkin.com>',
        to: [email],
        subject: "You're a founding member of Georgia Barter 🌿",
        text: `Hi ${displayName},\n\nYour Georgia Barter profile is live: https://barterkin.com/m/${username}\n\nClaim your account any time — go to https://barterkin.com/login, enter ${email}, and you'll get a magic link. From there you can edit your profile, respond to contacts, and change anything we got wrong.\n\nThanks for trusting us with your listing.\n\n— Ashley\nBarterkin`,
        html: `<p>Hi ${displayName},</p><p>Your Georgia Barter profile is live: <a href="https://barterkin.com/m/${username}">barterkin.com/m/${username}</a></p><p>Claim your account any time — go to <a href="https://barterkin.com/login">barterkin.com/login</a>, enter <strong>${email}</strong>, and you'll get a magic link. From there you can edit your profile, respond to contacts, and change anything we got wrong.</p><p>Thanks for trusting us with your listing.</p><p>— Ashley<br/>Barterkin</p>`,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { ok: false, status: res.status, body }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export async function seedOneMember(adminClient, m) {
  // Step A: idempotency
  if (await emailExists(adminClient, m.email)) {
    return { status: 'skipped', reason: 'email_exists' }
  }

  // Step A.5: validate (service-role bypasses RLS; we must gate in JS)
  const validationErrors = validateMember(m)
  if (validationErrors.length > 0) {
    return { status: 'error', reason: `validation: ${validationErrors.join('; ')}` }
  }

  // Step B: auth user
  const { data: userData, error: userErr } = await adminClient.auth.admin.createUser({
    email: m.email,
    email_confirm: true,
  })
  if (userErr) return { status: 'error', reason: `createUser: ${userErr.message}` }

  // Step C: profile + skills
  const username = await resolveUniqueUsername(adminClient, generateSlug(m.display_name))
  const { data: profile, error: profErr } = await adminClient
    .from('profiles')
    .insert({
      owner_id: userData.user.id,
      username,
      display_name: m.display_name,
      bio: m.bio ?? null,
      county_id: m.county_id,
      category_id: m.category_id,
      avatar_url: m.avatar_url ?? null,
      availability: m.availability ?? null,
      accepting_contact: m.accepting_contact ?? true,
      tiktok_handle: m.tiktok_handle ?? null,
      founding_member: true,
      is_published: true,
      banned: false,
    })
    .select('id')
    .single()
  if (profErr) return { status: 'error', reason: `insert profile: ${profErr.message}` }

  if (m.skills_offered?.length) {
    const { error } = await adminClient.from('skills_offered').insert(
      m.skills_offered.map((s, i) => ({ profile_id: profile.id, skill_text: s, sort_order: i })),
    )
    if (error) return { status: 'error', reason: `insert skills_offered: ${error.message}` }
  }
  if (m.skills_wanted?.length) {
    const { error } = await adminClient.from('skills_wanted').insert(
      m.skills_wanted.map((s, i) => ({ profile_id: profile.id, skill_text: s, sort_order: i })),
    )
    if (error) return { status: 'error', reason: `insert skills_wanted: ${error.message}` }
  }

  // Step D: welcome email (non-blocking)
  const mail = await sendWelcomeEmail(m.email, m.display_name, username)
  return {
    status: 'seeded',
    username,
    authUserId: userData.user.id,
    profileId: profile.id,
    emailResult: mail,
  }
}

// Detect direct execution (vs import from test)
const isMain = import.meta.url === `file://${process.argv[1]}` ||
               process.argv[1]?.endsWith('seed-founding-members.mjs')

if (isMain) {
  const summary = { seeded: 0, skipped: 0, emailFailed: 0, errors: [] }

  for (const m of members) {
    try {
      const result = await seedOneMember(admin, m)
      if (result.status === 'seeded') {
        if (result.emailResult?.ok) {
          console.log(`✓ seeded ${m.email} (${result.username}) + welcome sent`)
        } else if (result.emailResult?.skipped) {
          console.log(`✓ seeded ${m.email} (${result.username}); welcome skipped (no RESEND_API_KEY)`)
        } else {
          console.warn(`⚠ seeded ${m.email} (${result.username}) but email failed:`, result.emailResult)
          summary.emailFailed += 1
        }
        summary.seeded += 1
      } else if (result.status === 'skipped') {
        console.log(`⊝ skip ${m.email} — ${result.reason}`)
        summary.skipped += 1
      } else {
        console.error(`✗ ${m.email} — ${result.reason}`)
        summary.errors.push({ email: m.email, reason: result.reason })
      }
    } catch (err) {
      console.error(`✗ ${m.email} unexpected:`, err.message ?? err)
      summary.errors.push({ email: m.email, error: String(err) })
    }
  }

  console.log('\n=== Summary ===')
  console.log(JSON.stringify(summary, null, 2))

  // Coverage report (D-13 gate — also verified separately in Plan 04)
  const { count: total } = await admin
    .from('profiles')
    .select('id', { head: true, count: 'exact' })
    .eq('founding_member', true)
    .eq('is_published', true)
    .eq('banned', false)

  const { data: countyRows } = await admin
    .from('profiles')
    .select('county_id')
    .eq('founding_member', true)
    .eq('is_published', true)
    .eq('banned', false)
  const { data: catRows } = await admin
    .from('profiles')
    .select('category_id')
    .eq('founding_member', true)
    .eq('is_published', true)
    .eq('banned', false)

  const distinctCounties = new Set((countyRows ?? []).map((r) => r.county_id)).size
  const distinctCategories = new Set((catRows ?? []).map((r) => r.category_id)).size

  console.log('\n=== Coverage ===')
  console.log(`Total founding members published: ${total ?? 0}`)
  console.log(`Distinct counties: ${distinctCounties} (gate: ≥2)`)
  console.log(`Distinct categories: ${distinctCategories} (gate: ≥3)`)
  if ((total ?? 0) < 30) console.warn('⚠ SEED-05 not yet satisfied (need ≥30)')
  if (distinctCounties < 2) console.warn('⚠ SEED-05 not yet satisfied (need ≥2 counties)')
  if (distinctCategories < 3) console.warn('⚠ SEED-05 not yet satisfied (need ≥3 categories)')
}
