'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Copy, Share2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { captureClientEvent } from '@/lib/analytics-client'
import {
  buildFacebookShareUrl,
  buildXShareUrl,
} from '@/components/listings/ListingShareActions'
import type { ListingShareReminder as ListingShareReminderData } from '@/lib/data/dashboard-reminders'

interface ListingShareReminderProps {
  reminder: ListingShareReminderData
}

export function ListingShareReminder({ reminder }: ListingShareReminderProps) {
  const [copied, setCopied] = useState(false)

  function trackShare(shareTarget: 'x' | 'facebook' | 'copy-link') {
    captureClientEvent('listing_shared', {
      listing_id: reminder.listingId,
      listing_title: reminder.listingTitle,
      share_target: shareTarget,
      share_surface: 'dashboard_reminder',
    })
  }

  function openShareWindow(url: string, shareTarget: 'x' | 'facebook') {
    window.open(url, '_blank', 'noopener,noreferrer')
    trackShare(shareTarget)
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(reminder.shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      trackShare('copy-link')
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card className="border-emerald-200 bg-emerald-50/80">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-950">
            <Share2 className="h-5 w-5 text-emerald-700" />
            <h2 className="font-semibold">Drive traffic to your listing</h2>
          </div>
          <p className="max-w-2xl text-sm text-emerald-950/80">
            {`"${reminder.listingTitle}" has been live for a week with no saves yet. Share it outside Barterkin to bring in more local trade matches.`}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                openShareWindow(
                  buildXShareUrl(reminder.shareUrl, reminder.listingTitle),
                  'x',
                )
              }
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Share on X
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                openShareWindow(
                  buildFacebookShareUrl(reminder.shareUrl),
                  'facebook',
                )
              }
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Share on Facebook
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
            >
              {copied ? (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Copy className="mr-1.5 h-3.5 w-3.5" />
              )}
              {copied ? 'Copied link' : 'Copy link'}
            </Button>
          </div>

          <Link
            href={reminder.href}
            className={cn(
              buttonVariants({ size: 'sm', variant: 'ghost' }),
              'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100',
            )}
          >
            View listing
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
