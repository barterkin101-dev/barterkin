import { NextResponse } from 'next/server'
import { sendListingSaveNotifications } from '@/lib/actions/listing-save-notifications'
import { createLogger } from '@/lib/utils/logger'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const log = createLogger('listing-save-notifications-cron')
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    log.warn('Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await sendListingSaveNotifications()

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
