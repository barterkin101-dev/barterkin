import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Service-role client bypasses RLS. Use only from Supabase Edge Functions or
// explicitly-gated server routes. Plan 05 does NOT use this; Phase 5 contact
// relay lives in a Supabase Edge Function where the service-role key is
// supplied by Supabase's managed secrets store, NOT this bundle.
//
// Public repo rule: never remove `import 'server-only'` from line 1.
//
// Lazy initialization: the client is only created on first access so that
// build-time static analysis (e.g. Next.js `next build`) doesn't fail when
// SUPABASE_SERVICE_ROLE_KEY is absent in CI.
let _client: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function getSupabaseAdmin() {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is missing. ' +
        'Set it in your environment before using the admin client.',
    )
  }
  _client = createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}

// Backward-compatible export: proxy access through getter so existing code
// that does `supabaseAdmin.from(...)` continues to work.
export const supabaseAdmin = new Proxy({} as ReturnType<typeof getSupabaseAdmin>, {
  get(_target, prop) {
    const client = getSupabaseAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any)[prop]
  },
})
