import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'

export interface ActivityItem {
  id: string
  type: 'new_listing' | 'new_member' | 'trade_completed'
  countyName: string
  title: string
  subtitle: string
  timeAgo: string
}

export interface ActivityResult {
  items: ActivityItem[]
  error: string | null
}

const ACTIVITY_WINDOW_HOURS = 24
const MAX_ITEMS = 6

function formatTimeAgo(dateStr: string): string {
  const then = new Date(dateStr).getTime()
  const now = Date.now()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)

  if (diffMins < 5) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return 'Today'
}

/**
 * getRecentActivity — anonymized social-proof feed for the landing page.
 *
 * Pulls three activity types from the last 24h:
 *   1. New listings (active status, created recently)
 *   2. New published members (by county)
 *   3. Completed trades (listings marked completed)
 *
 * Results are shuffled and capped at MAX_ITEMS. No PII is exposed.
 */
export async function getRecentActivity(): Promise<ActivityResult> {
  const supabase = await createClient()
  const since = new Date(Date.now() - ACTIVITY_WINDOW_HOURS * 3_600_000).toISOString()

  try {
    // 1. New listings in last 24h
    const { data: listings, error: listingsErr } = await supabase
      .from('listings')
      .select('id, title, county_id, created_at, counties!inner(name)')
      .eq('status', 'active')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(8)

    if (listingsErr) throw listingsErr

    // 2. New published members in last 24h
    const { data: members, error: membersErr } = await supabase
      .from('profiles')
      .select('id, county_id, created_at, counties!inner(name)')
      .eq('is_published', true)
      .eq('banned', false)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(8)

    if (membersErr) throw membersErr

    // 3. Completed trades in last 24h
    const { data: trades, error: tradesErr } = await supabase
      .from('listings')
      .select('id, title, county_id, updated_at, counties!inner(name)')
      .eq('status', 'completed')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(8)

    if (tradesErr) throw tradesErr

    // Build activity items
    const items: ActivityItem[] = []

    for (const row of (listings ?? []) as Array<{
      id: string
      title: string
      county_id: number | null
      created_at: string
      counties: { name: string } | null
    }>) {
      items.push({
        id: `listing-${row.id}`,
        type: 'new_listing',
        countyName: row.counties?.name ?? 'Georgia',
        title: 'New listing',
        subtitle: `Someone in ${row.counties?.name ?? 'Georgia'} listed ${row.title}`,
        timeAgo: formatTimeAgo(row.created_at),
      })
    }

    // Aggregate new members by county
    const memberCountByCounty = new Map<string, { count: number; latest: string }>()
    for (const row of (members ?? []) as Array<{
      id: string
      county_id: number | null
      created_at: string
      counties: { name: string } | null
    }>) {
      const name = row.counties?.name ?? 'Georgia'
      const existing = memberCountByCounty.get(name)
      if (existing) {
        existing.count += 1
        if (row.created_at > existing.latest) existing.latest = row.created_at
      } else {
        memberCountByCounty.set(name, { count: 1, latest: row.created_at })
      }
    }
    for (const [countyName, { count, latest }] of memberCountByCounty) {
      items.push({
        id: `member-${countyName}`,
        type: 'new_member',
        countyName,
        title: 'New member',
        subtitle: `${count} new ${count === 1 ? 'member' : 'members'} joined from ${countyName}`,
        timeAgo: formatTimeAgo(latest),
      })
    }

    for (const row of (trades ?? []) as Array<{
      id: string
      title: string
      county_id: number | null
      updated_at: string
      counties: { name: string } | null
    }>) {
      items.push({
        id: `trade-${row.id}`,
        type: 'trade_completed',
        countyName: row.counties?.name ?? 'Georgia',
        title: 'Trade completed',
        subtitle: `A trade was completed in ${row.counties?.name ?? 'Georgia'}`,
        timeAgo: formatTimeAgo(row.updated_at),
      })
    }

    // Shuffle deterministically by id hash for stable SSR
    items.sort((a, b) => a.id.localeCompare(b.id))

    return { items: items.slice(0, MAX_ITEMS), error: null }
  } catch (err) {
    const log = createLogger('landing-activity')
    log.error('getRecentActivity failed', { error: err })
    return { items: [], error: String(err) }
  }
}
