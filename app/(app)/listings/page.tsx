import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getListings, PAGE_SIZE } from '@/lib/data/listings'
import { getContactLimitStatus } from '@/lib/data/contact-limit'
import { getBrowseUpgradeBannerProps } from '@/lib/browse-upgrade-banner'
import { BrowseUpgradeBanner } from '@/components/browse/BrowseUpgradeBanner'
import { ListingGrid } from '@/components/listings/ListingGrid'
import { ListingFilters } from '@/components/listings/ListingFilters'
import { DirectoryPagination } from '@/components/directory/DirectoryPagination'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Browse Listings — Barterkin',
  description:
    'Discover what Georgians are trading. Browse listings by category, county, and condition — from handmade goods to professional services.',
  alternates: { canonical: '/listings' },
  openGraph: {
    title: 'Browse Listings — Barterkin',
    description:
      'Discover what Georgians are trading. Browse listings by category, county, and condition — from handmade goods to professional services.',
    url: '/listings',
    siteName: 'Barterkin',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Browse Listings — Barterkin',
    description:
      'Discover what Georgians are trading. Browse listings by category, county, and condition — from handmade goods to professional services.',
  },
  robots: { index: true, follow: true },
}

interface ListingsPageProps {
  searchParams: Promise<{
    q?: string
    category?: string
    county?: string
    condition?: string
    page?: string
  }>
}

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? '1'))
  const filters = {
    q: params.q,
    categoryId: params.category ? Number(params.category) : undefined,
    countyId: params.county ? Number(params.county) : undefined,
    condition: params.condition ?? undefined,
    page,
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch filter options
  const [{ data: categories }, { data: counties }, profileResult] = await Promise.all([
    supabase.from('categories').select('id, name').order('id'),
    supabase.from('counties').select('id, name').order('name'),
    user
      ? supabase
        .from('profiles')
        .select('id, tier')
        .eq('owner_id', user.id)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const { listings, totalCount, error } = await getListings(filters)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const profile = profileResult.data
  const contactLimitStatus = profile?.tier === 'free'
    ? await getContactLimitStatus(profile.id, profile.tier)
    : null
  const browseUpgradeBanner = getBrowseUpgradeBannerProps('listings', profile?.tier, contactLimitStatus)

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">
          Browse Listings
        </h1>
        <p className="text-base text-muted-foreground">
          Discover what Georgians are trading. Find something you need or list what you have.
        </p>
      </header>

      {browseUpgradeBanner && <BrowseUpgradeBanner {...browseUpgradeBanner} />}

      <ListingFilters
        categories={categories ?? []}
        counties={counties ?? []}
      />

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          Something went wrong loading listings. Please try again.
        </div>
      )}

      <Suspense fallback={<ListingGridSkeleton />}>
        <ListingGrid listings={listings} />
      </Suspense>

      {totalPages > 1 && (
        <DirectoryPagination currentPage={page} totalPages={totalPages} searchParams={{}} />
      )}
    </div>
  )
}

function ListingGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[4/3] w-full rounded-lg" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}
