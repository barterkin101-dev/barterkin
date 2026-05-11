'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { AdminBanSchema } from '@/lib/schemas/admin'
import { safeParse } from '@/lib/utils/validation'
import { createLogger } from '@/lib/utils/logger'

// ============================================================================
// Phase 8 — ADMIN-04 ban/unban Server Actions
// ============================================================================
// Security: middleware guards /admin/* routes via ADMIN_EMAIL email check
// (ADMIN-06). Server Actions invoked from those pages inherit that protection.
// Service-role client bypasses RLS — we intentionally want to mutate the
// banned flag which owners themselves cannot set (see migration 003 RLS).
//
// Defense-in-depth: every admin action also verifies the caller's email
// matches ADMIN_EMAIL before executing. This prevents direct Server Action
// invocation by non-admin authenticated users.
// ============================================================================

export async function assertAdmin(): Promise<{ ok: false; error: string } | { ok: true }> {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    return { ok: false, error: 'Admin not configured.' }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== adminEmail) {
    return { ok: false, error: 'Unauthorized.' }
  }
  return { ok: true }
}

export interface BanResult {
  ok: boolean
  error?: string
}

export async function banMember(profileId: string): Promise<BanResult> {
  const auth = await assertAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }

  const parsed = safeParse(AdminBanSchema, { profileId })
  if (!parsed) {
    return { ok: false, error: 'Invalid profile id.' }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ banned: true })
    .eq('id', parsed.profileId)

  if (error) {
    const log = createLogger('admin')
    log.error('banMember update failed', { error, context: { code: error.code } })
    return { ok: false, error: error.message }
  }

  // Pitfall 3: invalidate BOTH the list page and the detail page; parent paths
  // are not automatically cleared by revalidating a child route.
  revalidatePath('/admin/members')
  revalidatePath(`/admin/members/${parsed.profileId}`)
  // Directory visibility also changes — keep the public directory in sync.
  revalidatePath('/directory')
  return { ok: true }
}

export async function unbanMember(profileId: string): Promise<BanResult> {
  const auth = await assertAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }

  const parsed = safeParse(AdminBanSchema, { profileId })
  if (!parsed) {
    return { ok: false, error: 'Invalid profile id.' }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ banned: false })
    .eq('id', parsed.profileId)

  if (error) {
    const log = createLogger('admin')
    log.error('unbanMember update failed', { error, context: { code: error.code } })
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/members')
  revalidatePath(`/admin/members/${parsed.profileId}`)
  revalidatePath('/directory')
  return { ok: true }
}
