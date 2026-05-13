'use client'

import { useState } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { captureClientEvent } from '@/lib/analytics-client'

export function buildReferralInviteMessage(referralLink: string): string {
  return `I’m on Barterkin, a local skill-trading network for neighbors. Join with my invite link: ${referralLink}`
}

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
  const [messageCopied, setMessageCopied] = useState(false)
  const [sharePending, setSharePending] = useState(false)
  const inviteMessage = buildReferralInviteMessage(referralLink)

  async function copyText(value: string, copyTarget: 'link' | 'message') {
    try {
      await navigator.clipboard.writeText(value)
      if (copyTarget === 'link') {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      } else {
        setMessageCopied(true)
        window.setTimeout(() => setMessageCopied(false), 2000)
      }
      captureClientEvent('referral_invite_copied', {
        referral_code: referralCode,
        referral_count: referralCount,
        credits,
        copy_target: copyTarget,
      })
    } catch {
      if (copyTarget === 'link') {
        setCopied(false)
      } else {
        setMessageCopied(false)
      }
    }
  }

  async function handleCopy() {
    await copyText(referralLink, 'link')
  }

  async function handleCopyMessage() {
    await copyText(inviteMessage, 'message')
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
        text: inviteMessage,
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

        <div className="rounded-lg border bg-background/80 p-4">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Suggested invite message
          </div>
          <p className="mt-2 text-sm text-foreground">
            {inviteMessage}
          </p>
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
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleCopyMessage}>
            {messageCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {messageCopied ? 'Copied message' : 'Copy invite message'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
