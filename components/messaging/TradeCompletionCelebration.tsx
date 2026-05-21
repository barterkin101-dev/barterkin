'use client'

import { useEffect, useState } from 'react'
import { useActionState } from 'react'
import { PartyPopper, Star, X, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { submitTradeReview } from '@/lib/actions/trade-completions'
import { captureClientEvent } from '@/lib/analytics-client'
import type { SubmitTradeReviewResult } from '@/lib/actions/trade-completions.types'

const CELEBRATION_DISMISS_KEY = 'barterkin_trade_celebration_dismissed'

function getDismissedConversations(): string[] {
  try {
    const raw = localStorage.getItem(CELEBRATION_DISMISS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function dismissConversation(conversationId: string) {
  try {
    const dismissed = getDismissedConversations()
    if (!dismissed.includes(conversationId)) {
      dismissed.push(conversationId)
      localStorage.setItem(CELEBRATION_DISMISS_KEY, JSON.stringify(dismissed))
    }
  } catch {
    // localStorage may be unavailable
  }
}

interface TradeCompletionCelebrationProps {
  conversationId: string
  isCompleted: boolean
  otherProfileId: string
  otherDisplayName: string
  listingId?: string | null
  hasReviewed?: boolean
}

export function TradeCompletionCelebration({
  conversationId,
  isCompleted,
  otherProfileId,
  otherDisplayName,
  listingId,
  hasReviewed = false,
}: TradeCompletionCelebrationProps) {
  const [open, setOpen] = useState(false)
  const [starHover, setStarHover] = useState(0)
  const [starValue, setStarValue] = useState(0)

  const [reviewResult, reviewAction, reviewPending] = useActionState<
    SubmitTradeReviewResult | null,
    FormData
  >(submitTradeReview, null)

  // Show celebration when trade becomes mutually completed and hasn't been dismissed
  useEffect(() => {
    if (!isCompleted) return
    const dismissed = getDismissedConversations()
    if (dismissed.includes(conversationId)) return

    // Small delay so the user sees the state change first
    const timer = setTimeout(() => {
      setOpen(true)
      captureClientEvent('trade_completion_celebrated', {
        conversation_id: conversationId,
        has_reviewed: hasReviewed,
      })
    }, 600)

    return () => clearTimeout(timer)
  }, [isCompleted, conversationId, hasReviewed])

  // Auto-close on successful review submission
  useEffect(() => {
    if (reviewResult?.ok) {
      setOpen(false)
      dismissConversation(conversationId)
    }
  }, [reviewResult, conversationId])

  function handleDismiss() {
    setOpen(false)
    dismissConversation(conversationId)
    captureClientEvent('review_prompt_dismissed', {
      conversation_id: conversationId,
      dismissed_after: 'celebration_modal',
    })
  }

  if (!isCompleted || hasReviewed) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) handleDismiss()
      else setOpen(true)
    }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <PartyPopper className="h-7 w-7 text-emerald-600" aria-hidden="true" />
          </div>
          <DialogTitle className="text-xl">Trade Complete!</DialogTitle>
          <DialogDescription>
            You and {otherDisplayName} successfully completed a trade. Take a moment to celebrate the win — then leave a review to help the community.
          </DialogDescription>
        </DialogHeader>

        <form action={reviewAction} className="space-y-4">
          <input type="hidden" name="conversationId" value={conversationId} />
          <input type="hidden" name="rateeProfileId" value={otherProfileId} />
          {listingId && <input type="hidden" name="listingId" value={listingId} />}
          <input type="hidden" name="score" value={starValue} />

          <div className="space-y-2">
            <p className="text-sm font-medium text-center">
              How was your experience with {otherDisplayName}?
            </p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setStarHover(star)}
                  onMouseLeave={() => setStarHover(0)}
                  onClick={() => setStarValue(star)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`h-7 w-7 ${
                      star <= (starHover || starValue)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <Textarea
            name="reviewText"
            placeholder={`What went well with ${otherDisplayName}? (optional, max 500 chars)`}
            maxLength={500}
            className="min-h-[80px] resize-none"
          />

          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              disabled={reviewPending || starValue === 0}
              className="w-full"
            >
              {reviewPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Review
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-muted-foreground"
            >
              <X className="mr-1 h-4 w-4" />
              Maybe later
            </Button>
          </div>

          {reviewResult?.ok === false && (
            <p className="text-xs text-destructive text-center">{reviewResult.error}</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
