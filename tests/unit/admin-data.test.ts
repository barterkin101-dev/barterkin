/**
 * Phase 8 — ADMIN-01 + ADMIN-05 + ADMIN-06 — admin data layer contract
 *
 * Tests the admin data layer against a live Supabase instance.
 * Skipped when SUPABASE_SERVICE_ROLE_KEY is not available.
 *
 * NOTE: contact_requests table was retired and replaced by conversations/messages.
 * This test file now seeds conversations + messages and tests getAdminConversations.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const hasAdmin = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
)
const d = hasAdmin ? describe : describe.skip

d('Phase 8 — admin data layer', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let admin: any
  const fixtureUserIds: string[] = []
  const fixtureConversationIds: string[] = []
  const fixtureMessageIds: string[] = []
  const baseStamp = Date.now()
  let senderProfileId = ''
  let recipientProfileId = ''

  async function seedProfile(opts: {
    display_name: string
    is_published?: boolean
    banned?: boolean
  }): Promise<{ userId: string; profileId: string }> {
    const email = `admin-data-${baseStamp}-${fixtureUserIds.length}@example.test`
    const { data: user, error: uErr } = await admin.auth.admin.createUser({
      email,
      password: 'test-only-pw-12345',
      email_confirm: true,
    })
    if (uErr) throw new Error(`createUser: ${uErr.message}`)
    const userId = user!.user!.id
    fixtureUserIds.push(userId)
    const username = `adminuser-${baseStamp}-${fixtureUserIds.length}`.slice(0, 40)
    const { data: profile, error: pErr } = await admin
      .from('profiles')
      .insert({
        owner_id: userId,
        display_name: opts.display_name,
        username,
        county_id: 13001,
        category_id: 1,
        is_published: opts.is_published ?? true,
        banned: opts.banned ?? false,
      })
      .select('id')
      .single()
    if (pErr) throw new Error(`insert profile: ${pErr.message}`)
    return { userId, profileId: profile.id }
  }

  async function seedConversation(opts: {
    participantIds: string[]
    messageCount?: number
  }): Promise<{ conversationId: string; messageIds: string[] }> {
    // Create conversation
    const { data: conv, error: convErr } = await admin
      .from('conversations')
      .insert({})
      .select('id')
      .single()
    if (convErr) throw new Error(`insert conversation: ${convErr.message}`)
    const conversationId = conv.id
    fixtureConversationIds.push(conversationId)

    // Add participants
    for (const profileId of opts.participantIds) {
      const { error: partErr } = await admin
        .from('conversation_participants')
        .insert({ conversation_id: conversationId, profile_id: profileId })
      if (partErr) throw new Error(`insert participant: ${partErr.message}`)
    }

    // Seed messages
    const messageIds: string[] = []
    const count = opts.messageCount ?? 1
    for (let i = 0; i < count; i++) {
      const senderId = opts.participantIds[i % opts.participantIds.length]
      const { data: msg, error: msgErr } = await admin
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_profile_id: senderId,
          content: `Test message ${i + 1} from admin data test suite.`,
        })
        .select('id')
        .single()
      if (msgErr) throw new Error(`insert message: ${msgErr.message}`)
      messageIds.push(msg.id)
      fixtureMessageIds.push(msg.id)
    }

    return { conversationId, messageIds }
  }

  beforeAll(async () => {
    const mod = await import('@/lib/supabase/admin')
    admin = mod.supabaseAdmin
    const sender = await seedProfile({ display_name: `AdminSender-${baseStamp}` })
    const recipient = await seedProfile({ display_name: `AdminRecipient-${baseStamp}` })
    senderProfileId = sender.profileId
    recipientProfileId = recipient.profileId

    // Seed two conversations: one with 1 message, one with 2 messages
    await seedConversation({
      participantIds: [senderProfileId, recipientProfileId],
      messageCount: 1,
    })
    await seedConversation({
      participantIds: [senderProfileId, recipientProfileId],
      messageCount: 2,
    })
  }, 60_000)

  afterAll(async () => {
    if (admin) {
      // Clean up in reverse dependency order: messages → participants → conversations
      for (const mid of fixtureMessageIds) {
        try { await admin.from('messages').delete().eq('id', mid) } catch { /* ignore */ }
      }
      for (const cid of fixtureConversationIds) {
        try { await admin.from('conversation_participants').delete().eq('conversation_id', cid) } catch { /* ignore */ }
        try { await admin.from('conversations').delete().eq('id', cid) } catch { /* ignore */ }
      }
      for (const uid of fixtureUserIds) {
        try { await admin.auth.admin.deleteUser(uid) } catch { /* ignore */ }
      }
    }
  }, 60_000)

  it('module exports 6 data functions', async () => {
    const mod = await import('@/lib/data/admin')
    expect(typeof mod.getAdminStats).toBe('function')
    expect(typeof mod.getAdminMembers).toBe('function')
    expect(typeof mod.getAdminMemberById).toBe('function')
    expect(typeof mod.getAdminContacts).toBe('function')
    expect(typeof mod.getAdminConversations).toBe('function')
    expect(typeof mod.getRevenueStats).toBe('function')
  })

  it('ADMIN-01 — getAdminStats returns non-negative integers for all counts', async () => {
    const { getAdminStats } = await import('@/lib/data/admin')
    const stats = await getAdminStats()
    expect(Number.isInteger(stats.totalMembers)).toBe(true)
    expect(stats.totalMembers).toBeGreaterThanOrEqual(2) // we just seeded 2
    expect(Number.isInteger(stats.totalMessages)).toBe(true)
    expect(stats.totalMessages).toBeGreaterThanOrEqual(3) // 1 + 2 messages seeded
    expect(Number.isInteger(stats.newThisWeek)).toBe(true)
    expect(stats.newThisWeek).toBeGreaterThanOrEqual(2)
    expect(Number.isInteger(stats.totalListings)).toBe(true)
    expect(Number.isInteger(stats.totalTickets)).toBe(true)
    expect(Number.isInteger(stats.totalDisputes)).toBe(true)
    expect(Number.isInteger(stats.totalConversations)).toBe(true)
    expect(stats.totalConversations).toBeGreaterThanOrEqual(2)
  })

  it('getAdminMembers returns rows including our seeded sender + recipient', async () => {
    const { getAdminMembers } = await import('@/lib/data/admin')
    const members = await getAdminMembers()
    const names = members.map((m) => m.display_name)
    expect(names).toContain(`AdminSender-${baseStamp}`)
    expect(names).toContain(`AdminRecipient-${baseStamp}`)
  })

  it('getAdminMemberById returns full profile for a known id', async () => {
    const { getAdminMemberById } = await import('@/lib/data/admin')
    const profile = await getAdminMemberById(senderProfileId)
    expect(profile).not.toBeNull()
    expect(profile!.id).toBe(senderProfileId)
    expect(profile!.display_name).toBe(`AdminSender-${baseStamp}`)
    expect(typeof profile!.is_published).toBe('boolean')
    expect(typeof profile!.banned).toBe('boolean')
    expect(Array.isArray(profile!.skills_offered)).toBe(true)
    expect(Array.isArray(profile!.skills_wanted)).toBe(true)
  })

  it('getAdminMemberById returns null for an unknown id', async () => {
    const { getAdminMemberById } = await import('@/lib/data/admin')
    const profile = await getAdminMemberById('00000000-0000-0000-0000-000000000000')
    expect(profile).toBeNull()
  })

  it('ADMIN-05 — getAdminContacts (retired) returns empty array', async () => {
    const { getAdminContacts } = await import('@/lib/data/admin')
    const contacts = await getAdminContacts()
    expect(contacts).toEqual([])
  })

  it('ADMIN-06 — getAdminConversations returns rows with participant names and message counts', async () => {
    const { getAdminConversations } = await import('@/lib/data/admin')
    const conversations = await getAdminConversations()
    expect(conversations.length).toBeGreaterThanOrEqual(2)

    // Verify descending updated_at
    for (let i = 1; i < conversations.length; i++) {
      expect(new Date(conversations[i - 1].updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(conversations[i].updated_at).getTime(),
      )
    }

    // Verify our seeded conversations have correct participant names
    const ours = conversations.filter((c) =>
      c.participant_names.some((n) => n.includes(`AdminSender-${baseStamp}`)),
    )
    expect(ours.length).toBeGreaterThanOrEqual(2)

    // Verify message counts (1 and 2)
    const counts = ours.map((c) => c.message_count).sort((a, b) => a - b)
    expect(counts).toContain(1)
    expect(counts).toContain(2)

    // Verify last_message is populated
    for (const c of ours) {
      expect(c.last_message).not.toBeNull()
      expect(c.last_message!.length).toBeGreaterThan(0)
    }
  })
})
