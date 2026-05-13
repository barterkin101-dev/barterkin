'use client'

import { useActionState } from 'react'
import { CheckCircle, Star, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  markTradeComplete,
  submitTradeReview,
} from '@/lib/actions/trade-completions'
import type {
  MarkTradeCompleteResult,
  SubmitTradeReviewResult,
} from '@/lib/actions/trade-completions.types'

interface TradeCompletionPanelProps {
  conversationId: string
  tradeStatus: string | null // 'pending' | 'initiator_marked' | 'recipient_marked' | 'completed'
  myProfileId: string
  otherProfileId: string
  otherDisplayName: string
  listingId?: string | null
  hasReviewed?: boolean
}

export function TradeCompletionPanel({
  conversationId,
  tradeStatus,
  myProfileId,
  otherProfileId,
  otherDisplayName,
  listingId,
  hasReviewed = false,
}: TradeCompletionPanelProps) {
  const [markResult, markAction, markPending] = useActionState<
    MarkTradeCompleteResult | null,
    FormData
  >(markTradeComplete, null)

  const [reviewResult, reviewAction, reviewPending] = useActionState<
    SubmitTradeReviewResult | null,
    FormData
  >(submitTradeReview, null)

  const effectiveStatus = markResult?.status ?? tradeStatus
  const isCompleted = effectiveStatus === 'completed'
  const iAlreadyMarked =
    effectiveStatus === 'initiator_marked' || effectiveStatus === 'completed'

  // If no trade record yet, show the mark-complete button
  if (!effectiveStatus || effectiveStatus === 'pending') {
    return (
      <form action={markAction} className="border-t bg-muted/30 p-4">
        <input type="hidden" name="conversationId" value={conversationId} />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Did you complete this trade?</p>
            <p className="text-xs text-muted-foreground">
              Both parties must mark complete to confirm.
            </p>
          </div>
          <Button type="submit" disabled={markPending} size="sm">
            {markPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Mark Complete
          </Button>
        </div>
        {markResult?.ok === false && (
          <p className="mt-2 text-xs text-destructive">{markResult.error}</p>
        )}
      </form>
    )
  }

  // One-sided: waiting for other party
  if (!isCompleted) {
    return (
      <div className="border-t bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 text-amber-500" />
          <span>
            You marked this trade complete. Waiting for {otherDisplayName} to confirm.
          </span>
        </div>
      </div>
    )
  }

  // Mutually completed — show review form (if not already reviewed)
  if (isCompleted && !hasReviewed) {
    return (
      <form action={reviewAction} className="border-t bg-muted/30 p-4 space-y-3">
        <input type="hidden" name="conversationId" value={conversationId} />
        <input type="hidden" name="rateeProfileId" value={otherProfileId} />
        {listingId && (
          <input type="hidden" name="listingId" value={listingId} />
        )}
        <p className="text-sm font-medium">
          Trade completed! How was your experience with {otherDisplayName}?
        </p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <label key={star} className="cursor-pointer">
              <input
                type="radio"
                name="score"
                value={star}
                className="sr-only"
                required
              />
              <Star className="h-5 w-5 text-muted-foreground hover:text-amber-400 peer-checked:text-amber-400" />
            </label>
          ))}
        </div>
        <Textarea
          name="reviewText"
          placeholder="Optional review (max 500 chars)..."
          maxLength={500}
          className="min-h-[60px] resize-none"
        />
        <Button type="submit" disabled={reviewPending} size="sm">
          {reviewPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Review
        </Button>
        {reviewResult?.ok === false && (
          <p className="text-xs text-destructive">{reviewResult.error}</p>
        )}
      </form>
    )
  }

  // Already reviewed or completed with no review needed
  return (
    <div className="border-t bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-sm text-green-700">
        <CheckCircle className="h-4 w-4" />
        <span>Trade completed. Thanks for reviewing!</span>
      </div>
    </div>
  )
}
