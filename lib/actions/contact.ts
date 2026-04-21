'use server'

// Phase 5 — Contact Relay + Trust server actions.
// See: .planning/phases/05-contact-relay-trust-joined/05-PATTERNS.md §lib/actions/contact.ts
// Auth: Pitfall §1 — getUser() for DML identity, NOT getSession()/getClaims() for trust decisions.
// Exception: sendContactRequest calls getSession() ONLY to extract access_token for Edge Function forwarding.

import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MessageSchema, BlockSchema, ReportSchema } from '@/lib/schemas/contact'
import type {
  SendContactResult,
  ReportMemberResult,
  MarkContactsSeenResult,
} from '@/lib/actions/contact.types'
import { ReportAdminNotifyEmail } from '@/emails/report-admin-notify'

// ============================================================================
// sendContactRequest — proxy to Supabase Edge Function (CONT-03)
// ============================================================================
export async function sendContactRequest(
  _prev: SendContactResult | null,
  formData: FormData,
): Promise<SendContactResult> {
  const supabase = await createClient()

  // Pitfall §1: getUser() revalidates against auth server (trust decision)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, code: 'unauthorized', error: 'Please sign in.' }

  const parsed = MessageSchema.safeParse({
    recipientProfileId: formData.get('recipientProfileId'),
    message: formData.get('message'),
  })
  if (!parsed.success) {
    return {
      ok: false,
      code: 'bad_message',
      error: parsed.error.issues[0]?.message ?? 'Please fix the message.',
    }
  }

  // LEGITIMATE exception to Pitfall §1: getSession() to extract access_token for forwarding.
  // The trust decision was already made by getUser() above. The Edge Function re-validates the JWT
  // via verify_jwt=true + supabase.auth.getUser(jwt). See RESEARCH §Common Operation 1.
  const { data: sess } = await supabase.auth.getSession()
  const accessToken = sess?.session?.access_token
  if (!accessToken) return { ok: false, code: 'unauthorized', error: 'Please sign in.' }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    console.error('[sendContactRequest] missing NEXT_PUBLIC_SUPABASE_URL')
    return { ok: false, code: 'unknown', error: 'Something went wrong.' }
  }

  let resp: Response
  try {
    resp = await fetch(`${supabaseUrl}/functions/v1/send-contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        recipient_profile_id: parsed.data.recipientProfileId,
        message: parsed.data.message,
      }),
    })
  } catch (err) {
    console.error('[sendContactRequest] edge function fetch failed', { code: (err as Error).name })
    return { ok: false, code: 'unknown', error: 'Something went wrong.' }
  }

  const body = (await resp.json().catch(() => ({}))) as {
    ok?: boolean
    code?: SendContactResult['code']
    error?: string
    contact_id?: string
  }
  if (!resp.ok || !body.ok) {
    return {
      ok: false,
      code: body.code ?? 'unknown',
      error: body.error ?? 'Something went wrong.',
    }
  }
  return { ok: true, contactId: body.contact_id }
}

// ============================================================================
// blockMember — RLS-gated INSERT into blocks, redirects to /directory
// ============================================================================
export async function blockMember(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) redirect('/login')

  const parsed = BlockSchema.safeParse({
    blockedOwnerId: formData.get('blockedOwnerId'),
    blockedDisplayName: formData.get('blockedDisplayName'),
    blockedUsername: formData.get('blockedUsername'),
  })
  if (!parsed.success) {
    console.error('[blockMember] bad input', { issues: parsed.error.issues.length })
    redirect('/directory?blocked_error=1')
  }

  if (parsed.data.blockedOwnerId === user.id) {
    redirect('/directory')
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

  const parsed = ReportSchema.safeParse({
    targetProfileId: formData.get('targetProfileId'),
    reason: formData.get('reason'),
    note: formData.get('note') ?? '',
  })
  if (!parsed.success) {
    return {
      ok: false,
      code: 'bad_input',
      error: 'Please fix the highlighted fields.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
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

// ============================================================================
// markContactsSeen — UPDATE seen_at on recipient's contact_requests (CONT-10)
// ============================================================================
export async function markContactsSeen(): Promise<MarkContactsSeenResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!profile) return { ok: true, count: 0 }

  // H-02 fix: call SECURITY DEFINER RPC instead of direct .update()
  // Direct UPDATE on contact_requests has been revoked from authenticated; the RPC
  // only mutates seen_at, preventing column-level abuse via the Supabase API.
  const { error } = await supabase.rpc('mark_contacts_seen', {
    p_recipient_profile_id: profile.id,
  })

  if (error) {
    console.error('[markContactsSeen] rpc failed', { code: error.code })
    return { ok: false, error: 'Could not mark contacts as seen.' }
  }

  // M-03 fix: bust the AppLayout cache segment so the unseen-contact badge clears immediately.
  // AppLayout and the profile page data-fetch are concurrent in Next.js App Router, so without
  // this revalidation the badge count may reflect the pre-update state on the same render.
  revalidatePath('/(app)', 'layout')
  return { ok: true, count: 0 }
}
