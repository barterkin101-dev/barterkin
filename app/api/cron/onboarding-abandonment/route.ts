import { NextResponse } from 'next/server'
import { sendOnboardingAbandonmentEmails } from '@/lib/actions/onboarding-abandonment'
import { createLogger } from '@/lib/utils/logger'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const log = createLogger('onboarding-abandonment-cron')
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    log.warn('Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await sendOnboardingAbandonmentEmails()

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? 'Unknown error' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    failed: result.failed,
    skipped: result.skipped,
  })
}
