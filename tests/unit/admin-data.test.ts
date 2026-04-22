/**
 * Phase 8 — ADMIN-01 + ADMIN-05 — admin data layer contract
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
  const fixtureContactIds: string[] = []
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

  async function seedContact(opts: {
    sender_id: string
    recipient_id: string
    message?: string
    status?: string
  }): Promise<string> {
    const { data, error } = await admin
      .from('contact_requests')
      .insert({
        sender_id: opts.sender_id,
        recipient_id: opts.recipient_id,
        message: opts.message ?? 'Hello there this is a valid test message for admin data tests.',
        status: opts.status ?? 'sent',
      })
      .select('id')
      .single()
    if (error) throw new Error(`insert contact: ${error.message}`)
    fixtureContactIds.push(data.id)
    return data.id
  }

  beforeAll(async () => {
    const mod = await import('@/lib/supabase/admin')
    admin = mod.supabaseAdmin
    const sender = await seedProfile({ display_name: `AdminSender-${baseStamp}` })
    const recipient = await seedProfile({ display_name: `AdminRecipient-${baseStamp}` })
    senderProfileId = sender.profileId
    recipientProfileId = recipient.profileId

    // Seed two contacts: one sent, one bounced
    await seedContact({
      sender_id: senderProfileId,
      recipient_id: recipientProfileId,
      status: 'sent',
    })
    await seedContact({
      sender_id: senderProfileId,
      recipient_id: recipientProfileId,
      status: 'bounced',
      message: 'This message will mark as bounced for admin test assertions here.',
    })
  }, 60_000)

  afterAll(async () => {
    if (admin) {
      for (const cid of fixtureContactIds) {
        await admin.from('contact_requests').delete().eq('id', cid).catch(() => undefined)
      }
      for (const uid of fixtureUserIds) {
        await admin.auth.admin.deleteUser(uid).catch(() => undefined)
      }
    }
  }, 60_000)

  it('module exports 4 data functions', async () => {
    const mod = await import('@/lib/data/admin')
    expect(typeof mod.getAdminStats).toBe('function')
    expect(typeof mod.getAdminMembers).toBe('function')
    expect(typeof mod.getAdminMemberById).toBe('function')
    expect(typeof mod.getAdminContacts).toBe('function')
  })

  it('ADMIN-01 — getAdminStats returns non-negative integers for all 3 counts', async () => {
    const { getAdminStats } = await import('@/lib/data/admin')
    const stats = await getAdminStats()
    expect(Number.isInteger(stats.totalMembers)).toBe(true)
    expect(stats.totalMembers).toBeGreaterThanOrEqual(2) // we just seeded 2
    expect(Number.isInteger(stats.totalContacts)).toBe(true)
    expect(stats.totalContacts).toBeGreaterThanOrEqual(2)
    expect(Number.isInteger(stats.newThisWeek)).toBe(true)
    expect(stats.newThisWeek).toBeGreaterThanOrEqual(2)
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

  it('ADMIN-05 — getAdminContacts (no status filter) returns rows newest-first', async () => {
    const { getAdminContacts } = await import('@/lib/data/admin')
    const contacts = await getAdminContacts()
    expect(contacts.length).toBeGreaterThanOrEqual(2)
    // Verify descending created_at
    for (let i = 1; i < contacts.length; i++) {
      expect(new Date(contacts[i - 1].created_at).getTime()).toBeGreaterThanOrEqual(
        new Date(contacts[i].created_at).getTime(),
      )
    }
  })

  it('ADMIN-05 — getAdminContacts(status=bounced) returns only bounced rows', async () => {
    const { getAdminContacts } = await import('@/lib/data/admin')
    const bounced = await getAdminContacts('bounced')
    expect(bounced.length).toBeGreaterThanOrEqual(1)
    for (const row of bounced) {
      expect(row.status).toBe('bounced')
    }
  })

  it('ADMIN-05 — getAdminContacts joins sender + recipient display_name via FK hints', async () => {
    const { getAdminContacts } = await import('@/lib/data/admin')
    const all = await getAdminContacts()
    const ours = all.find(
      (r) => r.sender_display_name === `AdminSender-${baseStamp}`,
    )
    expect(ours).toBeDefined()
    expect(ours!.recipient_display_name).toBe(`AdminRecipient-${baseStamp}`)
  })
})
