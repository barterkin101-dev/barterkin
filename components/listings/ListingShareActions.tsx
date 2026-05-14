'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { captureClientEvent } from '@/lib/analytics-client'

export function buildListingShareMessage(title: string): string {
  return `Trade with me on Barterkin: ${title}`
}

export function buildXShareUrl(shareUrl: string, title: string): string {
  const params = new URLSearchParams({
    text: buildListingShareMessage(title),
    url: shareUrl,
  })

  return `https://twitter.com/intent/tweet?${params.toString()}`
}

export function buildFacebookShareUrl(shareUrl: string): string {
  const params = new URLSearchParams({
    u: shareUrl,
  })

  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`
}

interface ListingShareActionsProps {
  listingId: string
  title: string
  shareUrl: string
}

export function ListingShareActions({
  listingId,
  title,
  shareUrl,
}: ListingShareActionsProps) {
  const [copied, setCopied] = useState(false)

  function trackShare(shareTarget: 'x' | 'facebook' | 'copy-link') {
    captureClientEvent('listing_shared', {
      listing_id: listingId,
      listing_title: title,
      share_target: shareTarget,
    })
  }

  function openShareWindow(url: string, shareTarget: 'x' | 'facebook') {
    window.open(url, '_blank', 'noopener,noreferrer')
    trackShare(shareTarget)
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      trackShare('copy-link')
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Share2 className="h-4 w-4" />
        Share this listing
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Post it to your network to bring in more local trade matches.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => openShareWindow(buildXShareUrl(shareUrl, title), 'x')}
        >
          <Share2 className="h-4 w-4" />
          Share on X
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => openShareWindow(buildFacebookShareUrl(shareUrl), 'facebook')}
        >
          <Share2 className="h-4 w-4" />
          Share on Facebook
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={handleCopyLink}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied link' : 'Copy link'}
        </Button>
      </div>
    </div>
  )
}
