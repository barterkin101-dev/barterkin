import { describe, it } from 'vitest'

describe('RLS email-verify gate (AUTH-04)', () => {
  it.todo('RLS_REQUIRES_LOCAL_SUPABASE: current_user_is_verified() returns false when email_confirmed_at is null')
  it.todo('RLS_REQUIRES_LOCAL_SUPABASE: current_user_is_verified() returns true when email_confirmed_at is set')
  it.todo('RLS_REQUIRES_LOCAL_SUPABASE: profiles SELECT policy (Phase 3) denies unverified user')
  it.todo('RLS_REQUIRES_LOCAL_SUPABASE: profiles SELECT policy (Phase 3) allows verified user')
})
