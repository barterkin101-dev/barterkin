'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { captureClientEvent } from '@/lib/analytics-client'

export function buildProfileShareMessage(displayName: string): string {
  return `Check out ${displayName} on Barterkin — trading skills with neighbors in Georgia.`
}

export function buildXProfileShareUrl(shareUrl: string, displayName: string): string {
  const params = new URLSearchParams({
    text: buildProfileShareMessage(displayName),
    url: shareUrl,
  })
  return `https://twitter.com/intent/tweet?${params.toString()}`
}

export function buildFacebookProfileShareUrl(shareUrl: string): string {
  const params = new URLSearchParams({ u: shareUrl })
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`
}

export function buildWhatsAppProfileShareUrl(shareUrl: string, displayName: string): string {
  const params = new URLSearchParams({
    text: `${buildProfileShareMessage(displayName)} ${shareUrl}`,
  })
  return `https://wa.me/?${params.toString()}`
}

interface ProfileShareActionsProps {
  username: string
  displayName: string
  shareUrl: string
  isOwnProfile: boolean
}

export function ProfileShareActions({
  username,
  displayName,
  shareUrl,
  isOwnProfile,
}: ProfileShareActionsProps) {
  const [copied, setCopied] = useState(false)

  function trackShare(shareTarget: 'x' | 'facebook' | 'whatsapp' | 'copy-link') {
    captureClientEvent('profile_shared', {
      username,
      display_name: displayName,
      share_target: shareTarget,
      is_own_profile: isOwnProfile,
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

  async function handleNativeShare() {
    if (typeof navigator.share !== 'function') {
      await handleCopyLink()
      return
    }
    try {
      await navigator.share({
        title: `${displayName} on Barterkin`,
        text: buildProfileShareMessage(displayName),
        url: shareUrl,
      })
      trackShare('native-share')
    } catch {
      // User cancellation — silent
    }
  }

  const heading = isOwnProfile ? 'Share your profile' : 'Share this member'
  const body = isOwnProfile
    ? 'Post your profile to your network to get more trade matches.'
    : `Spread the word about ${displayName} to help them find trade partners.`

  const hasNativeShare = typeof navigator.share === 'function'

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Share2 className="h-4 w-4" />
        {heading}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {hasNativeShare ? (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleNativeShare}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => openShareWindow(buildXProfileShareUrl(shareUrl, displayName), 'x')}
        >
          <Share2 className="h-4 w-4" />
          Share on X
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => openShareWindow(buildFacebookProfileShareUrl(shareUrl), 'facebook')}
        >
          <Share2 className="h-4 w-4" />
          Share on Facebook
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => {
            window.open(buildWhatsAppProfileShareUrl(shareUrl, displayName), '_blank', 'noopener,noreferrer')
            trackShare('whatsapp')
          }}
        >
          <Share2 className="h-4 w-4" />
          Share on WhatsApp
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
