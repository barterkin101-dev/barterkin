import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.barterkin.com'

// Static routes that should always appear in the sitemap
const STATIC_ROUTES = [
  '',
  '/directory',
  '/listings',
  '/login',
  '/signup',
  '/onboarding',
  '/legal/tos',
  '/legal/privacy',
  '/legal/guidelines',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  // Fetch all active listings (public pages)
  const { data: listings } = await supabase
    .from('listings')
    .select('id, updated_at')
    .eq('status', 'active')

  // Fetch all published profiles (public pages)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username, updated_at')
    .eq('is_published', true)
    .eq('banned', false)

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : 0.8,
  }))

  const listingEntries: MetadataRoute.Sitemap = (listings ?? []).map((listing) => ({
    url: `${SITE_URL}/listings/${listing.id}`,
    lastModified: listing.updated_at ? new Date(listing.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const profileEntries: MetadataRoute.Sitemap = (profiles ?? []).map((profile) => ({
    url: `${SITE_URL}/m/${profile.username}`,
    lastModified: profile.updated_at ? new Date(profile.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [...staticEntries, ...listingEntries, ...profileEntries]
}
