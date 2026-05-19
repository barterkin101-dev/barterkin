import { NextResponse } from 'next/server'
import { removeSavedSearch } from '@/lib/actions/saved-searches'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const formData = await request.formData()
  const result = await removeSavedSearch(null, formData)
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Failed' }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
