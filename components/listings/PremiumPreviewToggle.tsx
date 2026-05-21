'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { captureClientEvent } from '@/lib/analytics-client'
import { Sparkles, ShieldCheck, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PremiumPreviewToggleProps {
  listingId: string
}

export function PremiumPreviewToggle({ listingId }: PremiumPreviewToggleProps) {
  const [isPreviewOn, setIsPreviewOn] = useState(false)
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false)

  useEffect(() => {
    if (!hasTrackedImpression) {
      captureClientEvent('premium_preview_banner_impression', { listing_id: listingId })
      setHasTrackedImpression(true)
    }
  }, [hasTrackedImpression, listingId])

  const handleToggle = useCallback(
    (checked: boolean) => {
      setIsPreviewOn(checked)
      captureClientEvent('premium_preview_toggled', {
        listing_id: listingId,
        preview_enabled: checked,
      })
    },
    [listingId],
  )

  return (
    <Card
      className={cn(
        'overflow-hidden transition-colors',
        isPreviewOn ? 'border-amber-300 bg-amber-50/60' : 'border-border',
      )}
      data-testid="premium-preview-toggle"
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <span className="text-sm font-medium">
              {isPreviewOn ? 'Premium preview on' : 'Preview Premium'}
            </span>
          </div>
          <Switch
            checked={isPreviewOn}
            onCheckedChange={handleToggle}
            aria-label="Toggle premium preview"
            data-testid="premium-preview-switch"
          />
        </div>

        {isPreviewOn && (
          <div className="mt-4 space-y-3" data-testid="premium-preview-content">
            <div className="flex flex-wrap gap-2">
              <Badge className="border-amber-500 bg-amber-500 text-amber-950">
                <Sparkles className="mr-1 h-3 w-3" />
                Featured
              </Badge>
              <Badge
                variant="secondary"
                className="inline-flex items-center gap-1 bg-forest-deep/8 text-forest-deep ring-1 ring-forest-deep/15"
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Verified
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Your listing could look like this with Premium — featured placement, verified badge, and more visibility.
            </p>
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-1 text-sm font-medium text-forest-deep hover:underline"
              onClick={() =>
                captureClientEvent('premium_preview_cta_clicked', { listing_id: listingId })
              }
            >
              Upgrade to Premium
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PremiumPreviewProvider({
  children,
  isPreviewOn,
}: {
  children: React.ReactNode
  isPreviewOn: boolean
}) {
  return (
    <div
      data-testid="premium-preview-provider"
      className={cn(
        'transition-all',
        isPreviewOn ? 'rounded-lg ring-2 ring-amber-300/60 ring-offset-2' : '',
      )}
    >
      {children}
    </div>
  )
}
