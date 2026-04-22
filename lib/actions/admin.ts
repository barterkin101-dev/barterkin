'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'

// ============================================================================
// Phase 8 — ADMIN-04 ban/unban Server Actions
// ============================================================================
// Security: middleware guards /admin/* routes via ADMIN_EMAIL email check
// (ADMIN-06). Server Actions invoked from those pages inherit that protection.
// Service-role client bypasses RLS — we intentionally want to mutate the
// banned flag which owners themselves cannot set (see migration 003 RLS).
// ============================================================================

export interface BanResult {
  ok: boolean
  error?: string
}

export async function banMember(profileId: string): Promise<BanResult> {
  if (!profileId || typeof profileId !== 'string') {
    return { ok: false, error: 'Invalid profile id.' }
  }
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ banned: true })
    .eq('id', profileId)

  if (error) {
    console.error('[banMember] update failed', { code: error.code })
    return { ok: false, error: error.message }
  }

  // Pitfall 3: invalidate BOTH the list page and the detail page; parent paths
  // are not automatically cleared by revalidating a child route.
  revalidatePath('/admin/members')
  revalidatePath(`/admin/members/${profileId}`)
  // Directory visibility also changes — keep the public directory in sync.
  revalidatePath('/directory')
  return { ok: true }
}

export async function unbanMember(profileId: string): Promise<BanResult> {
  if (!profileId || typeof profileId !== 'string') {
    return { ok: false, error: 'Invalid profile id.' }
  }
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ banned: false })
    .eq('id', profileId)

  if (error) {
    console.error('[unbanMember] update failed', { code: error.code })
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/members')
  revalidatePath(`/admin/members/${profileId}`)
  revalidatePath('/directory')
  return { ok: true }
}
