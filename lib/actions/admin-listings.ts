'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { assertAdmin } from './admin'

export interface AdminModerateListingResult {
  ok: boolean
  error?: string
}

export async function adminModerateListing(
  _prev: AdminModerateListingResult | null,
  formData: FormData,
): Promise<AdminModerateListingResult> {
  const auth = await assertAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }

  const listingId = formData.get('listingId')
  const action = formData.get('action')

  if (!listingId || typeof listingId !== 'string') {
    return { ok: false, error: 'Invalid listing ID.' }
  }
  if (!action || typeof action !== 'string') {
    return { ok: false, error: 'Invalid action.' }
  }

  const allowed = new Set(['active', 'paused', 'cancelled'])
  if (!allowed.has(action)) {
    return { ok: false, error: 'Invalid action value.' }
  }

  const { error } = await supabaseAdmin
    .from('listings')
    .update({ status: action, updated_at: new Date().toISOString() })
    .eq('id', listingId)

  if (error) {
    console.error('[adminModerateListing] failed', { code: error.code })
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/listings')
  revalidatePath(`/admin/listings/${listingId}`)
  revalidatePath('/listings')
  revalidatePath(`/listings/${listingId}`)
  revalidatePath('/dashboard/listings')
  return { ok: true }
}

export async function adminModerateListingForm(formData: FormData): Promise<void> {
  await adminModerateListing(null, formData)
}
