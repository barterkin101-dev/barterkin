'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { AdminListingModerationSchema } from '@/lib/schemas/admin'
import { validateAndSanitize } from '@/lib/utils/validation'
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

  const parsed = validateAndSanitize(AdminListingModerationSchema, {
    listingId: formData.get('listingId'),
    action: formData.get('action'),
  })
  if (!parsed.ok) {
    return { ok: false, error: parsed.error }
  }

  const { error } = await supabaseAdmin
    .from('listings')
    .update({ status: parsed.data.action, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.listingId)

  if (error) {
    console.error('[adminModerateListing] failed', { code: error.code })
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/listings')
  revalidatePath(`/admin/listings/${parsed.data.listingId}`)
  revalidatePath('/listings')
  revalidatePath(`/listings/${parsed.data.listingId}`)
  revalidatePath('/dashboard/listings')
  return { ok: true }
}

export async function adminModerateListingForm(formData: FormData): Promise<void> {
  await adminModerateListing(null, formData)
}
