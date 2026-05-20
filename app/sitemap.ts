import type { MetadataRoute } from 'next'
import { CATEGORIES } from '@/lib/data/categories'
import { createClient } from '@/lib/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.barterkin.com'
const LISTINGS_PAGE_SIZE = 20

type ListingSitemapRow = {
  id: string
  category_id: number | null
  county_id: number | null
  created_at: string | null
  updated_at: string | null
}

type ProfileSitemapRow = {
  username: string | null
  category_id: number | null
  created_at: string | null
  updated_at: string | null
}

type SitemapEntryInput = {
  path: string
  lastModified: Date
  priority: number
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
  searchParams?: Record<string, string>
}

// Static routes that should always appear in the sitemap
const STATIC_ROUTES = [
  '',
  '/about',
  '/behind-barterkin',
  '/categories',
  '/directory',
  '/listings',
  '/login',
  '/signup',
  '/onboarding',
  '/pricing',
  '/legal/tos',
  '/legal/privacy',
  '/legal/guidelines',
] as const

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function latestDate(values: Array<string | null | undefined>, fallback: Date): Date {
  let latest = -Infinity

  for (const value of values) {
    const date = toDate(value)
    if (date && date.getTime() > latest) latest = date.getTime()
  }

  return latest === -Infinity ? fallback : new Date(latest)
}

function buildUrl(path: string, searchParams?: Record<string, string>) {
  const url = new URL(path, SITE_URL)
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value)
    }
  }
  return url.toString()
}

function createEntry({
  path,
  lastModified,
  priority,
  changeFrequency,
  searchParams,
}: SitemapEntryInput): MetadataRoute.Sitemap[number] {
  return {
    url: buildUrl(path, searchParams),
    lastModified,
    changeFrequency,
    priority,
  }
}

function buildPaginatedEntries({
  path,
  totalCount,
  lastModified,
  priority,
  baseSearchParams,
}: {
  path: string
  totalCount: number
  lastModified: Date
  priority: number
  baseSearchParams?: Record<string, string>
}): MetadataRoute.Sitemap {
  const totalPages = Math.ceil(totalCount / LISTINGS_PAGE_SIZE)

  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
    createEntry({
      path,
      lastModified,
      changeFrequency: 'weekly',
      priority,
      searchParams: {
        ...(baseSearchParams ?? {}),
        page: String(index + 2),
      },
    }),
  )
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const now = new Date()

  const [{ data: listings }, { data: profiles }] = await Promise.all([
    supabase
      .from('listings')
      .select('id, category_id, county_id, created_at, updated_at')
      .eq('status', 'active'),
    supabase
      .from('profiles')
      .select('username, category_id, created_at, updated_at')
      .eq('is_published', true)
      .eq('banned', false),
  ])

  const activeListings = (listings ?? []) as ListingSitemapRow[]
  const publishedProfiles = (profiles ?? []) as ProfileSitemapRow[]
  const mostRecentListingDate = latestDate(
    activeListings.flatMap((listing) => [listing.updated_at, listing.created_at]),
    now,
  )

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) =>
    createEntry({
      path: route,
      lastModified: route === '/listings' ? mostRecentListingDate : now,
      changeFrequency: route === '' ? 'daily' : 'weekly',
      priority: route === '' ? 1 : 0.8,
    }),
  )

  const listingEntries: MetadataRoute.Sitemap = activeListings.map((listing) =>
    createEntry({
      path: `/listings/${listing.id}`,
      lastModified: latestDate([listing.updated_at, listing.created_at], now),
      changeFrequency: 'weekly',
      priority: 0.7,
    }),
  )

  const profileEntries: MetadataRoute.Sitemap = publishedProfiles
    .filter((profile) => profile.username)
    .map((profile) =>
      createEntry({
        path: `/m/${profile.username}`,
        lastModified: latestDate([profile.updated_at, profile.created_at], now),
        changeFrequency: 'weekly',
        priority: 0.7,
      }),
    )

  const listingPaginationEntries = buildPaginatedEntries({
    path: '/listings',
    totalCount: activeListings.length,
    lastModified: mostRecentListingDate,
    priority: 0.6,
  })

  const listingCategoryEntries: MetadataRoute.Sitemap = []
  const listingCountyEntries: MetadataRoute.Sitemap = []
  const directoryCategoryEntries: MetadataRoute.Sitemap = []

  for (const category of CATEGORIES) {
    const categoryListings = activeListings.filter((listing) => listing.category_id === category.id)
    if (categoryListings.length > 0) {
      const lastModified = latestDate(
        categoryListings.flatMap((listing) => [listing.updated_at, listing.created_at]),
        now,
      )

      listingCategoryEntries.push(
        createEntry({
          path: '/listings',
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.6,
          searchParams: { category: String(category.id) },
        }),
      )

      listingCategoryEntries.push(
        ...buildPaginatedEntries({
          path: '/listings',
          totalCount: categoryListings.length,
          lastModified,
          priority: 0.5,
          baseSearchParams: { category: String(category.id) },
        }),
      )
    }

    const categoryProfiles = publishedProfiles.filter((profile) => profile.category_id === category.id)
    if (categoryProfiles.length > 0) {
      directoryCategoryEntries.push(
        createEntry({
          path: '/directory',
          lastModified: latestDate(
            categoryProfiles.flatMap((profile) => [profile.updated_at, profile.created_at]),
            now,
          ),
          changeFrequency: 'weekly',
          priority: 0.6,
          searchParams: { category: category.slug },
        }),
      )
    }
  }

  const countyIds = Array.from(
    new Set(
      activeListings
        .map((listing) => listing.county_id)
        .filter((countyId): countyId is number => countyId !== null),
    ),
  ).sort((a, b) => a - b)

  for (const countyId of countyIds) {
    const countyListings = activeListings.filter((listing) => listing.county_id === countyId)
    const lastModified = latestDate(
      countyListings.flatMap((listing) => [listing.updated_at, listing.created_at]),
      now,
    )

    listingCountyEntries.push(
      createEntry({
        path: '/listings',
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.5,
        searchParams: { county: String(countyId) },
      }),
    )

    listingCountyEntries.push(
      ...buildPaginatedEntries({
        path: '/listings',
        totalCount: countyListings.length,
        lastModified,
        priority: 0.4,
        baseSearchParams: { county: String(countyId) },
      }),
    )
  }

  return [
    ...staticEntries,
    ...listingEntries,
    ...profileEntries,
    ...listingPaginationEntries,
    ...listingCategoryEntries,
    ...listingCountyEntries,
    ...directoryCategoryEntries,
  ]
}
