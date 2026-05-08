import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface AdminListingRow {
  id: string
  title: string
  description: string
  condition: string | null
  status: string
  created_at: string
  profile_id: string
  profile_display_name: string | null
  profile_username: string | null
  county_name: string | null
  category_name: string | null
  image_count: number
}

export async function getAdminListings(): Promise<AdminListingRow[]> {
  const { data, error } = await supabaseAdmin
    .from('listings')
    .select(
      `id, title, description, condition, status, created_at, profile_id,
       profiles!inner(display_name, username),
       counties!left(name),
       categories!left(name),
       listing_images(count)`,
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getAdminListings] error', { code: error.code })
    throw new Error(error.message)
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const profile = row.profiles as { display_name?: string; username?: string } | null
    const county = row.counties as { name?: string } | null
    const category = row.categories as { name?: string } | null
    const imgs = row.listing_images as Array<Record<string, unknown>> | null
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      condition: (row.condition as string | null) ?? null,
      status: row.status as string,
      created_at: row.created_at as string,
      profile_id: row.profile_id as string,
      profile_display_name: profile?.display_name ?? null,
      profile_username: profile?.username ?? null,
      county_name: county?.name ?? null,
      category_name: category?.name ?? null,
      image_count: (imgs?.[0] as { count?: number } | undefined)?.count ?? 0,
    }
  })
}

export async function getAdminListingById(id: string): Promise<AdminListingRow | null> {
  const { data, error } = await supabaseAdmin
    .from('listings')
    .select(
      `id, title, description, condition, status, created_at, profile_id,
       profiles!inner(display_name, username),
       counties!left(name),
       categories!left(name),
       listing_images(count)`,
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[getAdminListingById] error', { code: error.code })
    return null
  }
  if (!data) return null

  const row = data as Record<string, unknown>
  const profile = row.profiles as { display_name?: string; username?: string } | null
  const county = row.counties as { name?: string } | null
  const category = row.categories as { name?: string } | null
  const imgs = row.listing_images as Array<Record<string, unknown>> | null
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    condition: (row.condition as string | null) ?? null,
    status: row.status as string,
    created_at: row.created_at as string,
    profile_id: row.profile_id as string,
    profile_display_name: profile?.display_name ?? null,
    profile_username: profile?.username ?? null,
    county_name: county?.name ?? null,
    category_name: category?.name ?? null,
    image_count: (imgs?.[0] as { count?: number } | undefined)?.count ?? 0,
  }
}
