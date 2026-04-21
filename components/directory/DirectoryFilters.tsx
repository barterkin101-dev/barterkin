'use client'
import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { DirectoryCategoryFilter } from './DirectoryCategoryFilter'
import { DirectoryCountyFilter } from './DirectoryCountyFilter'
import { DirectoryKeywordSearch } from './DirectoryKeywordSearch'

export function DirectoryFilters({
  initialCategorySlug,
  initialCountyFips,
  initialQ,
  activeFilterCount,
}: {
  initialCategorySlug: string | null
  initialCountyFips: number | null
  initialQ: string | null
  activeFilterCount: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const pushWith = React.useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      mutator(params)
      // Always reset pagination when any filter changes (RESEARCH Pitfall 5)
      params.delete('page')
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams],
  )

  const handleCategory = (slug: string | null) =>
    pushWith((p) => {
      if (slug) p.set('category', slug)
      else p.delete('category')
    })

  const handleCounty = (fips: number | null) =>
    pushWith((p) => {
      if (fips !== null) p.set('county', String(fips))
      else p.delete('county')
    })

  const handleQ = (q: string | null) =>
    pushWith((p) => {
      if (q && q.length >= 2) p.set('q', q)
      else p.delete('q')
    })

  const handleClearAll = () => {
    router.push(pathname)
  }

  return (
    <div
      className="rounded-lg border border-sage-light bg-sage-pale p-4 md:p-4"
      role="search"
      aria-label="Directory filters"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2">
        <DirectoryCategoryFilter
          value={initialCategorySlug}
          onChange={handleCategory}
        />
        <DirectoryCountyFilter
          value={initialCountyFips}
          onChange={handleCounty}
        />
        <DirectoryKeywordSearch initialValue={initialQ} onSubmit={handleQ} />
        {activeFilterCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClearAll}
            className="h-11 text-sm text-forest-mid hover:text-clay hover:underline md:ml-auto"
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
