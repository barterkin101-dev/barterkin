import 'server-only'

import { PostHog } from 'posthog-node'

import { createClient } from '@/lib/supabase/server'

export interface LandingFounderCard {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  county_name: string
  category_name: string
  top_skills: string[]
}

export interface LandingCoverageCounty {
  name: string
}

export interface LandingStatCounts {
  totalProfiles: number
  distinctCounties: number
}

export interface FoundersResult {
  profiles: LandingFounderCard[]
  error: string | null
}

export interface CoverageResult {
  counties: LandingCoverageCounty[]
  error: string | null
}

export interface StatsResult {
  totalProfiles: number
  distinctCounties: number
  error: string | null
}

// ---------------------------------------------------------------------------
// PostHog fail-soft helper — fire-and-forget error capture. Never blocks render.
// ---------------------------------------------------------------------------
function getPostHog(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null
  return new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  })
}

async function captureError(event: string, error: unknown): Promise<void> {
  try {
    const posthog = getPostHog()
    if (!posthog) return
    posthog.capture({
      distinctId: 'landing_server',
      event,
      properties: { error: String(error) },
    })
    await posthog.shutdown()
  } catch {
    // Never let analytics break the page.
  }
}

// ---------------------------------------------------------------------------
// getFoundingMembers — up to 6 founders for the landing strip.
// Column list is explicit per V8 Data Protection. Never selects email/owner_id.
// ---------------------------------------------------------------------------
export async function getFoundingMembers(): Promise<FoundersResult> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select(
        `id, username, display_name, avatar_url,
         counties!inner(name),
         categories!inner(name),
         skills_offered(skill_text, sort_order)`,
      )
      .eq('founding_member', true)
      .eq('is_published', true)
      .eq('banned', false)
      .order('created_at', { ascending: false })
      .limit(6)

    if (error) throw error

    const profiles: LandingFounderCard[] = (data ?? []).map((row: Record<string, unknown>) => {
      const allSkills = (row.skills_offered ?? []) as Array<{
        skill_text: string
        sort_order: number
      }>
      const topSkills = [...allSkills]
        .sort((a, b) => a.sort_order - b.sort_order)
        .slice(0, 3)
        .map((s) => s.skill_text)
      return {
        id: row.id,
        username: row.username ?? '',
        display_name: row.display_name ?? 'Unnamed member',
        avatar_url: row.avatar_url,
        county_name: row.counties?.name ?? 'Unknown',
        category_name: row.categories?.name ?? '',
        top_skills: topSkills,
      }
    })

    return { profiles, error: null }
  } catch (e) {
    console.error('[getFoundingMembers]', e)
    await captureError('landing_founding_strip_error', e)
    return { profiles: [], error: String(e) }
  }
}

// ---------------------------------------------------------------------------
// getCountyCoverage — up to 24 distinct county names with published members.
// ---------------------------------------------------------------------------
export async function getCountyCoverage(): Promise<CoverageResult> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('counties!inner(name)')
      .eq('is_published', true)
      .eq('banned', false)
      .limit(500) // bound memory; dedupe below

    if (error) throw error

    const seen = new Set<string>()
    const counties: LandingCoverageCounty[] = []
    for (const row of (data ?? []) as Array<{ counties: { name: string } | null }>) {
      const name = row.counties?.name
      if (!name || seen.has(name)) continue
      seen.add(name)
      counties.push({ name })
      if (counties.length >= 24) break
    }
    counties.sort((a, b) => a.name.localeCompare(b.name))

    return { counties, error: null }
  } catch (e) {
    console.error('[getCountyCoverage]', e)
    await captureError('landing_county_coverage_error', e)
    return { counties: [], error: String(e) }
  }
}

// ---------------------------------------------------------------------------
// getStatCounts — total published profiles + distinct counties.
// Fallback values from UI-SPEC §Hero when the query fails.
// ---------------------------------------------------------------------------
export async function getStatCounts(): Promise<StatsResult> {
  try {
    const supabase = await createClient()
    const [totalResult, countiesResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id', { head: true, count: 'exact' })
        .eq('is_published', true)
        .eq('banned', false),
      supabase
        .from('profiles')
        .select('county_id')
        .eq('is_published', true)
        .eq('banned', false),
    ])

    if (totalResult.error) throw totalResult.error
    if (countiesResult.error) throw countiesResult.error

    const distinct = new Set(
      ((countiesResult.data ?? []) as Array<{ county_id: number | null }>)
        .map((r) => r.county_id)
        .filter((x): x is number => x != null),
    ).size

    return {
      totalProfiles: totalResult.count ?? 0,
      distinctCounties: distinct,
      error: null,
    }
  } catch (e) {
    console.error('[getStatCounts]', e)
    await captureError('landing_stat_strip_error', e)
    return { totalProfiles: 30, distinctCounties: 2, error: String(e) }
  }
}
