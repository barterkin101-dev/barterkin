import { NextResponse } from 'next/server'
import { toggleSearchAlert } from '@/lib/actions/saved-searches'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const formData = await request.formData()
  const result = await toggleSearchAlert(null, formData)
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Failed' }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
