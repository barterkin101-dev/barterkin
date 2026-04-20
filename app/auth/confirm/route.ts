import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * AUTH-02: Magic-link verification.
 * Supabase sends the user here after they click the link in their email.
 * URL shape: /auth/confirm?token_hash=<...>&type=email&next=<path>
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const _next = searchParams.get('next')
  // T-2-01 open-redirect guard
  const next = (_next?.startsWith('/') && !_next?.startsWith('//')) ? _next : '/directory'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      redirect(next)
    }
    console.error('[auth/confirm] verifyOtp failed', {
      code: error?.code,
      status: error?.status,
      // deliberately NOT logging error.message — may contain PII
    })
    redirect(`/auth/error?reason=verify_failed`)
  }

  redirect(`/auth/error?reason=missing_token`)
}
