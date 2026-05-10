'use server'

// Trust server actions (block + report).
// The legacy email-based contact relay (sendContactRequest) was removed in favor of in-app messaging.
// Auth: Pitfall §1 — getUser() for DML identity, NOT getSession()/getClaims() for trust decisions.

import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BlockSchema, ReportSchema } from '@/lib/schemas/contact'
import { validateAndSanitize } from '@/lib/utils/validation'
import { getClientIp, limitBlockAction, limitReportSubmission } from '@/lib/rate-limit-public'
import type {
  ReportMemberResult,
} from '@/lib/actions/contact.types'
import { ReportAdminNotifyEmail } from '@/emails/report-admin-notify'

// ============================================================================
// blockMember — RLS-gated INSERT into blocks, redirects to /directory
// ============================================================================
export async function blockMember(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) redirect('/login')

  // Rate limit: 10 block actions per hour per IP
  const ip = await getClientIp()
  const limit = await limitBlockAction(ip)
  if (!limit.success) {
    redirect('/directory?blocked_error=rate_limited')
  }

  const parsed = validateAndSanitize(BlockSchema, {
    blockedOwnerId: formData.get('blockedOwnerId'),
    blockedDisplayName: formData.get('blockedDisplayName'),
    blockedUsername: formData.get('blockedUsername'),
  })
  if (!parsed.ok) {
    console.error('[blockMember] bad input', { issues: Object.keys(parsed.fieldErrors ?? {}) })
    redirect('/directory?blocked_error=1')
  }

  if (parsed.data.blockedOwnerId === user.id) {
    redirect('/directory')
    return
  }

  const { error } = await supabase.from('blocks').upsert(
    { blocker_id: user.id, blocked_id: parsed.data.blockedOwnerId },
    { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true },
  )
  if (error) {
    console.error('[blockMember] upsert failed', { code: error.code })
    redirect('/directory?blocked_error=1')
  }

  revalidatePath('/directory')
  revalidatePath(`/m/${parsed.data.blockedUsername}`)
  redirect(`/directory?blocked=${encodeURIComponent(parsed.data.blockedDisplayName)}`)
}

// ============================================================================
// reportMember — RLS-gated INSERT into reports + admin-notify email (TRUST-06)
// ============================================================================
export async function reportMember(
  _prev: ReportMemberResult | null,
  formData: FormData,
): Promise<ReportMemberResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, code: 'unauthorized', error: 'Please sign in.' }
  if (!user.email_confirmed_at) return { ok: false, code: 'unauthorized', error: 'Verify your email first.' }

  // Rate limit: 5 reports per hour per IP
  const ip = await getClientIp()
  const limit = await limitReportSubmission(ip)
  if (!limit.success) {
    return { ok: false, code: 'rate_limited', error: 'Too many reports. Please try again later.' }
  }

  const parsed = validateAndSanitize(ReportSchema, {
    targetProfileId: formData.get('targetProfileId'),
    reason: formData.get('reason'),
    note: formData.get('note') ?? '',
  })
  if (!parsed.ok) {
    return {
      ok: false,
      code: 'bad_input',
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    }
  }

  // Load target profile for self-report guard + email
  const { data: target, error: targetErr } = await supabase
    .from('profiles')
    .select('id, owner_id, display_name, username')
    .eq('id', parsed.data.targetProfileId)
    .maybeSingle()
  if (targetErr || !target) {
    console.error('[reportMember] target lookup failed', { code: targetErr?.code })
    return { ok: false, code: 'bad_input', error: 'Target profile not found.' }
  }
  if (target.owner_id === user.id) {
    return { ok: false, code: 'self_report', error: "You can't report yourself." }
  }

  // Insert (RLS WITH CHECK ensures reporter_id = auth.uid() + verified)
  const { data: inserted, error: insertErr } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      target_profile_id: parsed.data.targetProfileId,
      reason: parsed.data.reason,
      note: parsed.data.note && parsed.data.note.trim().length > 0 ? parsed.data.note : null,
    })
    .select('id, created_at')
    .single()
  if (insertErr || !inserted) {
    console.error('[reportMember] insert failed', { code: insertErr?.code })
    return { ok: false, code: 'unknown', error: 'Something went wrong submitting your report.' }
  }

  // Admin notify (TRUST-06) — non-blocking; failure does not fail the report
  try {
    const apiKey = process.env.RESEND_API_KEY
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL ?? 'hello@barterkin.com'
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'
    if (!apiKey) {
      console.warn('[reportMember] RESEND_API_KEY missing; admin notify skipped')
    } else {
      const { data: reporter } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('owner_id', user.id)
        .maybeSingle()
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from: 'Barterkin Ops <noreply@barterkin.com>',
        to: [adminEmail],
        subject: `[Barterkin Report] ${parsed.data.reason} — ${target.display_name ?? target.username}`,
        react: ReportAdminNotifyEmail({
          reporterDisplayName: reporter?.display_name ?? '(unknown)',
          reporterEmail: user.email ?? '(unknown)',
          reporterUsername: reporter?.username ?? '(unknown)',
          targetDisplayName: target.display_name ?? '(unknown)',
          targetUsername: target.username ?? '(unknown)',
          targetProfileUrl: `${siteUrl}/m/${target.username}`,
          reason: parsed.data.reason,
          note: parsed.data.note && parsed.data.note.trim().length > 0 ? parsed.data.note : undefined,
          reportId: inserted.id,
          createdAt: inserted.created_at,
        }),
      })
    }
  } catch (err) {
    console.error('[reportMember] admin notify failed', { code: (err as Error).name })
  }

  return { ok: true }
}


