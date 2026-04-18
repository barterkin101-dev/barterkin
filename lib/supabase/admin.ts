import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Service-role client bypasses RLS. Use only from Supabase Edge Functions or
// explicitly-gated server routes. Plan 05 does NOT use this; Phase 5 contact
// relay lives in a Supabase Edge Function where the service-role key is
// supplied by Supabase's managed secrets store, NOT this bundle.
//
// Public repo rule: never remove `import 'server-only'` from line 1.
export const supabaseAdmin = createSupabaseClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)
