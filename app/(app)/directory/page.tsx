import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { parseSearchParams } from '@/lib/data/directory-params'
import { getDirectoryRows, PAGE_SIZE } from '@/lib/data/directory'
import { getContactLimitStatus } from '@/lib/data/contact-limit'
import { getBrowseUpgradeBannerProps } from '@/lib/browse-upgrade-banner'
import { DirectoryFilters } from '@/components/directory/DirectoryFilters'
import { ActiveFilterChips } from '@/components/directory/ActiveFilterChips'
import { DirectoryResultCounter } from '@/components/directory/DirectoryResultCounter'
import { DirectoryGrid } from '@/components/directory/DirectoryGrid'
import { DirectoryPagination } from '@/components/directory/DirectoryPagination'
import { BlockedToast } from '@/components/directory/BlockedToast'
import { BrowseUpgradeBanner } from '@/components/browse/BrowseUpgradeBanner'
import { SaveSearchButton } from '@/components/directory/SaveSearchButton'

export const metadata: Metadata = {
  title: 'Directory',
  description:
    'Find Georgia residents offering skills to trade — woodworking, cooking, music, tech, and more. One community, 159 counties.',
  alternates: { canonical: '/directory' },
  openGraph: {
    title: 'Directory — Barterkin',
    description:
      'Find Georgia residents offering skills to trade — woodworking, cooking, music, tech, and more. One community, 159 counties.',
    url: '/directory',
    siteName: 'Barterkin',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Directory — Barterkin',
    description:
      'Find Georgia residents offering skills to trade — woodworking, cooking, music, tech, and more. One community, 159 counties.',
  },
  robots: { index: true, follow: true },
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const rawParams = await searchParams
  const filters = parseSearchParams(rawParams)
  const { data: { user } } = await supabase.auth.getUser()
  const [directoryResult, profileResult] = await Promise.all([
    getDirectoryRows(filters),
    user
      ? supabase
        .from('profiles')
        .select('id, tier')
        .eq('owner_id', user.id)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  const { profiles, totalCount, error } = directoryResult
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const profile = profileResult.data
  const contactLimitStatus = profile?.tier === 'free'
    ? await getContactLimitStatus(profile.id, profile.tier)
    : null
  const browseUpgradeBanner = getBrowseUpgradeBannerProps('directory', profile?.tier, contactLimitStatus)

  const blockedName = typeof rawParams.blocked === 'string' ? rawParams.blocked : undefined
  const blockedError = rawParams.blocked_error === '1'

  return (
    <>
      <BlockedToast blockedName={blockedName} errorFlag={blockedError} />
      <header className="space-y-2">
        <h1 className="font-serif text-[32px] font-bold leading-[1.15] text-forest-deep">
          Directory
        </h1>
        <p className="text-base text-muted-foreground">
          Browse Georgians by skill, category, and county.
        </p>
      </header>

      {browseUpgradeBanner && <BrowseUpgradeBanner {...browseUpgradeBanner} />}

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <DirectoryFilters
            initialCategorySlug={filters.categorySlug}
            initialCountyFips={filters.countyFips}
            initialQ={filters.q}
            activeFilterCount={filters.activeFilterCount}
          />
          {profile && (
            <SaveSearchButton
              profileId={profile.id}
              query={filters.q}
              categoryId={filters.categoryId}
              countyId={filters.countyId}
            />
          )}
        </div>
        <ActiveFilterChips
          categorySlug={filters.categorySlug}
          countyFips={filters.countyFips}
          q={filters.q}
        />
      </div>

      {totalCount > 0 && (
        <DirectoryResultCounter
          from={(filters.page - 1) * PAGE_SIZE + 1}
          to={Math.min(filters.page * PAGE_SIZE, totalCount)}
          total={totalCount}
        />
      )}

      <DirectoryGrid
        profiles={profiles}
        totalCount={totalCount}
        activeFilterCount={filters.activeFilterCount}
        hasError={error !== null}
      />

      {totalCount > PAGE_SIZE && (
        <DirectoryPagination
          currentPage={filters.page}
          totalPages={totalPages}
          searchParams={rawParams}
        />
      )}
    </>
  )
}
