import Image from 'next/image'
import { StarRating } from './StarRating'
import type { RatingRow } from '@/lib/data/ratings'

export function RatingCard({ rating }: { rating: RatingRow }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {rating.rater?.avatar_url ? (
            <Image
              src={rating.rater.avatar_url}
              alt={rating.rater.display_name ?? ''}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted" />
          )}
          <span className="text-sm font-medium">
            {rating.rater?.display_name ?? rating.rater?.username ?? 'Member'}
          </span>
        </div>
        <StarRating value={rating.score} readOnly size="sm" />
      </div>
      {rating.review_text && (
        <p className="mt-2 text-sm text-muted-foreground">{rating.review_text}</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {new Date(rating.created_at).toLocaleDateString()}
      </p>
    </div>
  )
}
