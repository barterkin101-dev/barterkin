import { describe, it, expect } from 'vitest'

/**
 * Phase 8 — Admin data layer contract (unit tests, no live DB)
 *
 * These tests verify that the admin data module exports the expected
 * functions without needing a live Supabase connection.
 *
 * Full integration tests (with DB seeding) are in admin-data.test.ts
 * and are skipped when SUPABASE_SERVICE_ROLE_KEY is not available.
 */

describe('Phase 8 — admin data layer exports', () => {
  it('module exports 5 data functions', async () => {
    const mod = await import('@/lib/data/admin')
    expect(typeof mod.getAdminStats).toBe('function')
    expect(typeof mod.getAdminMembers).toBe('function')
    expect(typeof mod.getAdminMemberById).toBe('function')
    expect(typeof mod.getAdminContacts).toBe('function')
    expect(typeof mod.getAdminConversations).toBe('function')
  })
})
