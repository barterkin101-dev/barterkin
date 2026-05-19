import { NextResponse } from 'next/server'
import { saveSearch } from '@/lib/actions/saved-searches'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const formData = await request.formData()
  const result = await saveSearch(null, formData)
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Failed' }, { status: 400 })
  }
  return NextResponse.json({ ok: true, searchId: result.searchId })
}
