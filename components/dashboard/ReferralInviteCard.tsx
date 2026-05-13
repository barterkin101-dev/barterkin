'use client'

import { useState } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { captureClientEvent } from '@/lib/analytics-client'

export function ReferralInviteCard({
  referralCode,
  referralLink,
  credits,
  referralCount,
}: {
  referralCode: string
  referralLink: string
  credits: number
  referralCount: number
}) {
  const [copied, setCopied] = useState(false)
  const [sharePending, setSharePending] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      captureClientEvent('referral_invite_copied', {
        referral_code: referralCode,
        referral_count: referralCount,
        credits,
      })
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  async function handleShare() {
    if (typeof navigator.share !== 'function') {
      await handleCopy()
      return
    }

    setSharePending(true)

    try {
      await navigator.share({
        title: 'Join me on Barterkin',
        text: 'Join me on Barterkin and trade skills with local members.',
        url: referralLink,
      })

      captureClientEvent('referral_invite_shared', {
        method: 'native-share',
        referral_code: referralCode,
        referral_count: referralCount,
        credits,
      })
    } catch {
      // User cancellations and unsupported share targets should stay silent.
    } finally {
      setSharePending(false)
    }
  }

  const hasNativeShare = typeof navigator.share === 'function'

  return (
    <Card className="border-sage-light bg-sage-pale/60">
      <CardHeader className="space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Share2 className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="font-serif text-2xl">Invite friends</CardTitle>
        <p className="text-sm text-muted-foreground">
          Share your invite link to bring more skilled neighbors into the directory.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-background/80 p-3 text-center">
            <div className="text-2xl font-bold text-primary">{credits}</div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Credits
            </div>
          </div>
          <div className="rounded-lg border bg-background/80 p-3 text-center">
            <div className="text-2xl font-bold text-primary">{referralCount}</div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Friends joined
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-background/80 p-4">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Your referral code
          </div>
          <div className="mt-2 font-mono text-lg font-semibold tracking-[0.22em] text-foreground">
            {referralCode}
          </div>
          <div className="mt-3 break-all text-sm text-muted-foreground">{referralLink}</div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={handleShare}
            disabled={sharePending}
          >
            <Share2 className="h-4 w-4" />
            {hasNativeShare ? (sharePending ? 'Sharing...' : 'Share invite link') : 'Share or copy link'}
          </Button>
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied link' : 'Copy invite link'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
