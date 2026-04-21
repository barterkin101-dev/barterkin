import type { Metadata } from 'next'
import { parseSearchParams } from '@/lib/data/directory-params'
import { getDirectoryRows, PAGE_SIZE } from '@/lib/data/directory'
import { DirectoryFilters } from '@/components/directory/DirectoryFilters'
import { ActiveFilterChips } from '@/components/directory/ActiveFilterChips'
import { DirectoryResultCounter } from '@/components/directory/DirectoryResultCounter'
import { DirectoryGrid } from '@/components/directory/DirectoryGrid'
import { DirectoryPagination } from '@/components/directory/DirectoryPagination'
import { BlockedToast } from '@/components/directory/BlockedToast'

export const metadata: Metadata = {
  title: 'Directory',
  description:
    'Find Georgia residents offering skills to trade — woodworking, cooking, music, tech, and more. One community, 159 counties.',
  robots: { index: false, follow: false },
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const rawParams = await searchParams
  const filters = parseSearchParams(rawParams)
  const { profiles, totalCount, error } = await getDirectoryRows(filters)
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

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

      <div className="mt-8 space-y-4">
        <DirectoryFilters
          initialCategorySlug={filters.categorySlug}
          initialCountyFips={filters.countyFips}
          initialQ={filters.q}
          activeFilterCount={filters.activeFilterCount}
        />
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
