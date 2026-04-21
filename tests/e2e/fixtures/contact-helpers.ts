/**
 * Phase 5 — E2E fixture helpers for contact relay + trust tests
 *
 * Uses the Supabase admin client (service-role key) to:
 *  - Create verified auth user pairs for two-profile contact flows
 *  - Flip accepting_contact and banned flags for edge case coverage
 *  - Insert blocks + query contact_requests for assertion helpers
 *  - Clean up all test data after each suite
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * IMPORTANT: This file is test-only. The service-role key is read from
 * process.env and is never bundled into the Next.js app (CI-only secret).
 * See threat model T-5-01-02 in Plan 05-01.
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const adminClient = () =>
  createClient(URL, SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export interface VerifiedPair {
  senderId: string
  senderEmail: string
  senderPassword: string
  senderUsername: string
  recipientId: string
  recipientEmail: string
  recipientPassword: string
  recipientUsername: string
}

/**
 * Creates two verified auth users with published profiles (accepting_contact=true).
 * Suitable as sender + recipient for contact relay E2E tests.
 *
 * @param prefix - Short string to namespace emails/usernames (e.g. 'relay', 'block')
 */
export async function createVerifiedPair(prefix: string): Promise<VerifiedPair> {
  const stamp = Date.now()
  const admin = adminClient()

  const senderEmail = `${prefix}-sender-${stamp}@example.test`
  const recipientEmail = `${prefix}-recipient-${stamp}@example.test`
  const password = 'TestOnly-pw-12345!'

  // Create two verified auth users
  const { data: senderAuth, error: sErr } = await admin.auth.admin.createUser({
    email: senderEmail,
    password,
    email_confirm: true,
  })
  if (sErr) throw new Error(`createVerifiedPair sender failed: ${sErr.message}`)

  const { data: recipientAuth, error: rErr } = await admin.auth.admin.createUser({
    email: recipientEmail,
    password,
    email_confirm: true,
  })
  if (rErr) throw new Error(`createVerifiedPair recipient failed: ${rErr.message}`)

  const senderId = senderAuth.user!.id
  const recipientId = recipientAuth.user!.id

  const senderUsername = `${prefix}-s-${stamp}`.slice(0, 40)
  const recipientUsername = `${prefix}-r-${stamp}`.slice(0, 40)

  // Create published sender profile
  const { error: spErr } = await admin.from('profiles').insert({
    owner_id: senderId,
    display_name: `Sender ${stamp}`,
    username: senderUsername,
    county_id: 13001, // Appling County
    category_id: 1,
    is_published: true,
    accepting_contact: true,
    banned: false,
  })
  if (spErr) throw new Error(`createVerifiedPair sender profile failed: ${spErr.message}`)

  // Create published recipient profile
  const { error: rpErr } = await admin.from('profiles').insert({
    owner_id: recipientId,
    display_name: `Recipient ${stamp}`,
    username: recipientUsername,
    county_id: 13001, // Appling County
    category_id: 1,
    is_published: true,
    accepting_contact: true,
    banned: false,
  })
  if (rpErr) throw new Error(`createVerifiedPair recipient profile failed: ${rpErr.message}`)

  return {
    senderId,
    senderEmail,
    senderPassword: password,
    senderUsername,
    recipientId,
    recipientEmail,
    recipientPassword: password,
    recipientUsername,
  }
}

/**
 * cleanupPair — Deletes both auth users in a pair created by createVerifiedPair.
 * ON DELETE CASCADE removes profiles, contact_requests, blocks, reports automatically.
 *
 * @param senderId - auth.users.id of the sender
 * @param recipientId - auth.users.id of the recipient
 */
export async function cleanupPair(senderId: string, recipientId: string): Promise<void> {
  const admin = adminClient()
  if (senderId) await admin.auth.admin.deleteUser(senderId)
  if (recipientId) await admin.auth.admin.deleteUser(recipientId)
}

/**
 * Flips the accepting_contact flag on a profile.
 * Used to test the "hidden when not accepting" and "not_accepting" rejection conditions.
 *
 * @param ownerId - auth.users.id (owner_id FK on profiles)
 * @param accepting - target value for accepting_contact
 */
export async function setAcceptingContact(ownerId: string, accepting: boolean): Promise<void> {
  const { error } = await adminClient()
    .from('profiles')
    .update({ accepting_contact: accepting })
    .eq('owner_id', ownerId)
  if (error) throw new Error(`setAcceptingContact failed: ${error.message}`)
}

/**
 * Flips the banned flag on a profile.
 * Used to test ban enforcement in directory visibility and relay rejection.
 *
 * @param ownerId - auth.users.id (owner_id FK on profiles)
 * @param banned - target value for banned
 */
export async function setBanned(ownerId: string, banned: boolean): Promise<void> {
  const { error } = await adminClient()
    .from('profiles')
    .update({ banned })
    .eq('owner_id', ownerId)
  if (error) throw new Error(`setBanned failed: ${error.message}`)
}

/**
 * Inserts a block row via the admin client.
 * Used to test block enforcement without going through the UI.
 *
 * @param blockerOwnerId - auth.users.id of the blocker
 * @param blockedOwnerId - auth.users.id of the blocked user
 */
export async function insertBlock(blockerOwnerId: string, blockedOwnerId: string): Promise<void> {
  const { error } = await adminClient()
    .from('blocks')
    .insert({ blocker_id: blockerOwnerId, blocked_id: blockedOwnerId })
    .select()
  // ON CONFLICT DO NOTHING — safe to call multiple times
  if (error && !error.message.includes('duplicate')) {
    throw new Error(`insertBlock failed: ${error.message}`)
  }
}

/**
 * Counts contact_requests rows for a recipient (optionally filtering unseen only).
 * Used for badge count assertions and relay insertion verification.
 *
 * @param opts.recipientId - auth.users.id of the recipient
 * @param opts.unseenOnly - if true, only counts rows where seen_at IS NULL
 */
export async function countContactRequests(opts: {
  recipientId: string
  unseenOnly?: boolean
}): Promise<number> {
  let query = adminClient()
    .from('contact_requests')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', opts.recipientId)

  if (opts.unseenOnly) {
    query = query.is('seen_at', null)
  }

  const { count, error } = await query
  if (error) throw new Error(`countContactRequests failed: ${error.message}`)
  return count ?? 0
}
