import { DirectoryCard } from './DirectoryCard'
import { DirectoryEmptyState } from './DirectoryEmptyState'
import { DirectoryZeroResultsState } from './DirectoryZeroResultsState'
import { DirectoryErrorState } from './DirectoryErrorState'
import type { DirectoryProfile } from '@/lib/data/directory.types'

export function DirectoryGrid({
  profiles,
  totalCount,
  activeFilterCount,
  hasError,
}: {
  profiles: DirectoryProfile[]
  totalCount: number
  activeFilterCount: number
  hasError: boolean
}) {
  if (hasError) return <DirectoryErrorState />
  if (totalCount === 0 && activeFilterCount === 0) return <DirectoryEmptyState />
  if (totalCount === 0 && activeFilterCount > 0) return <DirectoryZeroResultsState />

  return (
    <div
      className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3"
      role="list"
      aria-label="Directory profiles"
    >
      {profiles.map((p) => (
        <div key={p.id} role="listitem">
          <DirectoryCard profile={p} />
        </div>
      ))}
    </div>
  )
}
