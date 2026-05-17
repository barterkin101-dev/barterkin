'use client'

import { useState } from 'react'
import { Copy, Check, Share2, Gift, Users, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { captureClientEvent } from '@/lib/analytics-client'
import {
  buildEmailReferralShareUrl,
  buildFacebookReferralShareUrl,
  buildLinkedInReferralShareUrl,
  buildReferralInviteMessage,
  buildSmsReferralShareUrl,
  buildTelegramReferralShareUrl,
  buildWhatsAppReferralShareUrl,
  buildXReferralShareUrl,
} from '@/lib/referral-share'

interface ReferralProgramClientProps {
  referralCode: string | null
  referralLink: string | null
  displayName: string | null
  credits: number
  convertedReferralCount: number
  pendingReferralCount: number
}

function getMilestoneProgress(converted: number) {
  const milestones = [1, 3, 5]
  const next = milestones.find((m) => converted < m)
  if (!next) return null
  return {
    value: Math.round((converted / next) * 100),
    label: `${converted} of ${next} published referrals`,
    nextCredits: next * 10,
  }
}

function getMomentumCopy(converted: number, pending: number) {
  if (pending > 0) {
    const potential = pending * 10
    return {
      eyebrow: 'Next reward',
      title:
        pending === 1
          ? '1 pending invite can unlock 10 credits'
          : `${pending} pending invites can unlock ${potential} credits`,
      body:
        pending === 1
          ? 'One invited member is still one publish away from converting. Send a quick follow-up and close the loop.'
          : 'These invited members are still one publish away from converting. A quick follow-up can turn them into credits.',
    }
  }
  if (converted > 0) {
    return {
      eyebrow: 'Next reward',
      title: 'One more referral unlocks another 10 credits',
      body: 'Copy your invite message and send it to one neighbor who would be a strong first trade match.',
    }
  }
  return {
    eyebrow: 'First reward',
    title: 'Your first published referral unlocks 10 credits',
    body: 'Start with one friend or neighbor who can finish their profile quickly and make the first trade feel easy.',
  }
}

export function ReferralProgramClient({
  referralCode,
  referralLink,
  displayName,
  credits,
  convertedReferralCount,
  pendingReferralCount,
}: ReferralProgramClientProps) {
  const [copied, setCopied] = useState(false)
  const [sharePending, setSharePending] = useState(false)

  const hasLink = Boolean(referralLink && referralLink.trim().length > 0)
  const inviteMessage = referralLink ? buildReferralInviteMessage(referralLink) : ''
  const milestoneProgress = getMilestoneProgress(convertedReferralCount)
  const momentumCopy = getMomentumCopy(convertedReferralCount, pendingReferralCount)
  const hasNativeShare = typeof navigator.share === 'function'

  async function copyLink() {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      captureClientEvent('referral_link_copied', {
        referral_code: referralCode,
        referral_count: convertedReferralCount,
        credits,
        copy_target: 'link',
        share_surface: 'referral_program_page',
      })
    } catch {
      setCopied(false)
    }
  }

  async function handleShare() {
    if (!referralLink) return
    if (typeof navigator.share !== 'function') {
      await copyLink()
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
        referral_count: convertedReferralCount,
        credits,
        share_surface: 'referral_program_page',
      })
    } catch {
      // silent
    } finally {
      setSharePending(false)
    }
  }

  function handleChannelShare(
    channel: 'x' | 'facebook' | 'whatsapp' | 'telegram' | 'linkedin' | 'email' | 'sms',
  ) {
    if (!referralLink) return
    const shareUrl =
      channel === 'x'
        ? buildXReferralShareUrl(referralLink)
        : channel === 'facebook'
          ? buildFacebookReferralShareUrl(referralLink)
          : channel === 'whatsapp'
            ? buildWhatsAppReferralShareUrl(referralLink, inviteMessage)
            : channel === 'telegram'
              ? buildTelegramReferralShareUrl(referralLink)
              : channel === 'linkedin'
                ? buildLinkedInReferralShareUrl(referralLink)
                : channel === 'email'
                  ? buildEmailReferralShareUrl(referralLink, inviteMessage)
                  : buildSmsReferralShareUrl(referralLink, inviteMessage)

    window.open(shareUrl, '_blank', 'noopener,noreferrer')
    captureClientEvent('referral_invite_shared', {
      method: channel,
      referral_code: referralCode,
      referral_count: convertedReferralCount,
      credits,
      share_surface: 'referral_program_page',
    })
  }

  if (!hasLink || !referralCode) {
    return (
      <Card className="border-sage-light bg-sage-pale/60">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Your referral link is not available yet. Complete your profile setup to unlock your unique referral code.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{credits}</div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Credits earned
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Users className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{convertedReferralCount}</div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Converted
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{pendingReferralCount}</div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Pending
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral code + link */}
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="font-serif text-xl">Your referral link</CardTitle>
          <p className="text-sm text-muted-foreground">
            Share this link with friends and neighbors. When they sign up and publish their first listing, you both earn 10 credits.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Referral code
            </div>
            <div className="mt-2 font-mono text-lg font-semibold tracking-[0.22em]">
              {referralCode}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 rounded-lg border bg-muted/30 p-4">
              <div className="break-all text-sm text-muted-foreground">{referralLink}</div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={copyLink}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>

          {hasNativeShare && (
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={handleShare}
              disabled={sharePending}
            >
              <Share2 className="h-4 w-4" />
              {sharePending ? 'Sharing...' : 'Share invite link'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Momentum nudge */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
            {momentumCopy.eyebrow}
          </div>
          <p className="mt-2 text-base font-semibold">{momentumCopy.title}</p>
          <p className="mt-2 text-sm text-muted-foreground">{momentumCopy.body}</p>
        </CardContent>
      </Card>

      {/* Milestone progress */}
      {milestoneProgress && (
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Next milestone
            </div>
            <p className="mt-2 text-base font-semibold">
              {milestoneProgress.label} unlocks {milestoneProgress.nextCredits} total credits
            </p>
            <div className="mt-4 space-y-2">
              <Progress
                value={milestoneProgress.value}
                className="h-2"
                aria-label="Referral milestone progress"
                aria-valuetext={milestoneProgress.label}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share channels */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Share via</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => handleChannelShare('whatsapp')}
            >
              <Share2 className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => handleChannelShare('sms')}
              aria-label="Share referral via SMS"
            >
              <Share2 className="h-4 w-4" />
              SMS
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => handleChannelShare('x')}
            >
              <Share2 className="h-4 w-4" />
              X / Twitter
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => handleChannelShare('facebook')}
            >
              <Share2 className="h-4 w-4" />
              Facebook
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => handleChannelShare('telegram')}
            >
              <Share2 className="h-4 w-4" />
              Telegram
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => handleChannelShare('linkedin')}
            >
              <Share2 className="h-4 w-4" />
              LinkedIn
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => handleChannelShare('email')}
            >
              <Share2 className="h-4 w-4" />
              Email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
