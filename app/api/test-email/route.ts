import { NextResponse } from 'next/server'
import { Resend } from 'resend'

// Node runtime — resend SDK uses Node APIs.
export const runtime = 'nodejs'

// Dev-only endpoint. Phase 5 replaces this with a Supabase Edge Function
// (send-contact) where the service-role + Resend keys live in managed secrets,
// not the Next.js bundle.
export async function POST(request: Request) {
  // Production guard — if this ever deploys to prod by mistake, return 404.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled in production' }, { status: 404 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY not configured — populate .env.local' },
      { status: 500 },
    )
  }

  const body = (await request.json().catch(() => ({}))) as { to?: string }
  const to = body.to
  if (!to) {
    return NextResponse.json({ error: 'missing `to` field in body' }, { status: 400 })
  }

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    // Mail domain confirmed 10/10 mail-tester pre-phase (CONTEXT.md).
    // A2 in RESEARCH §Assumptions Log — if the mail domain differs, edit the `from:` here.
    from: 'Barterkin <hello@barterkin.com>',
    to: [to],
    subject: 'Barterkin Phase 1 — Resend test send',
    text:
      'If you received this, Resend is correctly wired to the verified domain. ' +
      'This endpoint is disabled in production; Phase 5 replaces it with a Supabase Edge Function.',
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, id: data?.id })
}
