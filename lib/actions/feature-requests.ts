'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'
import { captureEvent } from '@/lib/analytics'
import { z } from 'zod'

const log = createLogger('feature-requests')

const FeatureRequestSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters.').max(120, 'Title must be under 120 characters.'),
  description: z.string().trim().min(20, 'Description must be at least 20 characters.').max(2000, 'Description must be under 2000 characters.'),
  category: z.enum(['general', 'ui', 'billing', 'messaging', 'listings', 'search', 'other']).default('general'),
})

export interface SubmitFeatureRequestResult {
  ok: boolean
  error?: string
}

export async function submitFeatureRequest(
  _prev: SubmitFeatureRequestResult | null,
  formData: FormData,
): Promise<SubmitFeatureRequestResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return { ok: false, error: 'Not authenticated.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!profile) {
    return { ok: false, error: 'Profile not found.' }
  }

  const raw = {
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    category: (formData.get('category') as string) || 'general',
  }

  const parsed = FeatureRequestSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { ok: false, error: first?.message ?? 'Please fix the highlighted fields.' }
  }

  const { error } = await supabase
    .from('feature_requests')
    .insert({
      profile_id: profile.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
    })

  if (error) {
    log.error('submitFeatureRequest insert failed', { context: { code: error.code, message: error.message } })
    return { ok: false, error: 'Failed to submit. Please try again.' }
  }

  captureEvent(profile.id, 'feature_request_submitted', {
    category: parsed.data.category,
  })

  // revalidatePath('/dashboard') // Next.js cache revalidation — skip in tests
  return { ok: true }
}
