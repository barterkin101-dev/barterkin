'use client'

import { StarRating } from './StarRating'

interface RatingSummaryProps {
  avg: number | null
  count: number
}

export function RatingSummary({ avg, count }: RatingSummaryProps) {
  if (count === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No ratings yet
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <StarRating value={Math.round(avg ?? 0)} readOnly size="sm" />
      <span className="text-sm font-medium">
        {avg?.toFixed(1)} / 5
      </span>
      <span className="text-sm text-muted-foreground">
        ({count} review{count === 1 ? '' : 's'})
      </span>
    </div>
  )
}
