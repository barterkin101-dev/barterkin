'use client'

import { useState } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { captureClientEvent } from '@/lib/analytics-client'

export function buildReferralInviteMessage(referralLink: string): string {
  return `I'm on Barterkin, a local skill-trading network for neighbors. Join with my invite link: ${referralLink}`
}

export function buildReferralFollowUpMessage(referralLink: string): string {
  return `Quick follow-up: your Barterkin invite is still live if you want to join my local skill-trading circle. Here's the link again: ${referralLink}`
}

export function buildXReferralShareUrl(referralLink: string): string {
  const params = new URLSearchParams({
    text: buildReferralInviteMessage(referralLink),
    url: referralLink,
  })

  return `https://twitter.com/intent/tweet?${params.toString()}`
}

export function buildFacebookReferralShareUrl(referralLink: string): string {
  const params = new URLSearchParams({
    u: referralLink,
  })

  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`
}

export function buildWhatsAppReferralShareUrl(
  referralLink: string,
  message: string = buildReferralInviteMessage(referralLink),
): string {
  const params = new URLSearchParams({
    text: message,
  })

  return `https://wa.me/?${params.toString()}`
}

export function buildTelegramReferralShareUrl(referralLink: string): string {
  const params = new URLSearchParams({
    url: referralLink,
    text: buildReferralInviteMessage(referralLink),
  })

  return `https://t.me/share/url?${params.toString()}`
}

export function buildLinkedInReferralShareUrl(referralLink: string): string {
  const params = new URLSearchParams({
    url: referralLink,
  })

  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`
}

export function buildEmailReferralShareUrl(
  referralLink: string,
  message: string = buildReferralInviteMessage(referralLink),
): string {
  const params = new URLSearchParams({
    subject: 'Join me on Barterkin',
    body: message,
  })

  return `mailto:?${params.toString()}`
}

export function buildSmsReferralShareUrl(
  referralLink: string,
  message: string = buildReferralInviteMessage(referralLink),
): string {
  const params = new URLSearchParams({
    body: message,
  })

  return `sms:?${params.toString()}`
}

function getReferralMomentumCopy(convertedReferralCount: number, pendingReferralCount: number) {
  if (pendingReferralCount > 0) {
    const potentialCredits = pendingReferralCount * 10

    return {
      eyebrow: 'Next reward',
      title:
        pendingReferralCount === 1
          ? '1 pending invite can unlock 10 credits'
          : `${pendingReferralCount} pending invites can unlock ${potentialCredits} credits`,
      body:
        pendingReferralCount === 1
          ? 'One invited member is still one publish away from converting. Send a quick follow-up and close the loop.'
          : 'These invited members are still one publish away from converting. A quick follow-up can turn them into credits.',
    }
  }

  if (convertedReferralCount > 0) {
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

function getReferralMilestoneCopy(convertedReferralCount: number) {
  const milestones = [1, 3, 5]
  const nextMilestone = milestones.find((milestone) => convertedReferralCount < milestone)

  if (!nextMilestone) {
    const unlockedCredits = convertedReferralCount * 10

    return {
      eyebrow: 'Referral milestone',
      title: `You've already unlocked ${unlockedCredits} credits from referrals`,
      body: 'Keep sharing your link to stack more referral credits as new members publish.',
    }
  }

  const referralsRemaining = nextMilestone - convertedReferralCount
  const unlockedCredits = nextMilestone * 10

  return {
    eyebrow: 'Next milestone',
    title:
      referralsRemaining === 1
        ? `1 more published referral reaches ${nextMilestone} total`
        : `${referralsRemaining} more published referrals reach ${nextMilestone} total`,
    body:
      referralsRemaining === 1
        ? `That milestone unlocks ${unlockedCredits} referral credits in total.`
        : `That milestone unlocks ${unlockedCredits} referral credits in total once those invites publish.`,
  }
}

function getReferralMilestoneProgress(convertedReferralCount: number) {
  const milestones = [1, 3, 5]
  const nextMilestone = milestones.find((milestone) => convertedReferralCount < milestone)

  if (!nextMilestone) {
    return null
  }

  return {
    value: Math.round((convertedReferralCount / nextMilestone) * 100),
    label: `${convertedReferralCount} of ${nextMilestone} published referrals`,
  }
}

function getReferralConversionSnapshot(
  convertedReferralCount: number,
  pendingReferralCount: number,
) {
  const totalTrackedInvites = convertedReferralCount + pendingReferralCount

  if (totalTrackedInvites === 0) {
    return null
  }

  const conversionRate = Math.round((convertedReferralCount / totalTrackedInvites) * 100)

  if (pendingReferralCount === 0) {
    return {
      eyebrow: 'Invite conversion',
      title:
        convertedReferralCount === 1
          ? 'Your 1 tracked invite has already published'
          : `All ${convertedReferralCount} tracked invites have already published`,
      body: 'Keep sharing with similar people while this message angle is converting cleanly.',
      value: conversionRate,
      label: `${convertedReferralCount} of ${totalTrackedInvites} tracked invites published`,
    }
  }

  return {
    eyebrow: 'Invite conversion',
    title: `${convertedReferralCount} of ${totalTrackedInvites} tracked invites have published`,
    body:
      conversionRate >= 50
        ? 'You already have proof the pitch works. Follow up with the remaining invites before they cool off.'
        : 'A quick follow-up can lift this conversion rate. Start with the warmest pending invite first.',
    value: conversionRate,
    label: `${conversionRate}% of tracked invites published`,
  }
}

function getReferralNextStepCopy(convertedReferralCount: number, pendingReferralCount: number) {
  if (pendingReferralCount > 0) {
    return {
      eyebrow: 'Best next move',
      title:
        pendingReferralCount === 1
          ? 'Follow up with your 1 pending invite today'
          : `Follow up with your ${pendingReferralCount} pending invites today`,
      body:
        'Use WhatsApp, SMS, or email below while your invite is still warm. One publish turns that follow-up into credits.',
    }
  }

  if (convertedReferralCount > 0) {
    return {
      eyebrow: 'Best next move',
      title: 'Send 1 fresh invite to keep your referral streak moving',
      body:
        'Start with one neighbor who is likely to publish quickly so you can stack the next 10-credit referral reward.',
    }
  }

  return {
    eyebrow: 'Best next move',
    title: 'Start with your warmest first invite',
    body:
      'Pick one friend, neighbor, or past collaborator who can complete a profile fast and get your first referral conversion on the board.',
  }
}

function getReferralMessageVariant(pendingReferralCount: number) {
  if (pendingReferralCount > 0) {
    return {
      label: 'Suggested follow-up message',
      message: buildReferralFollowUpMessage,
      whatsappLabel: 'Follow up on WhatsApp',
      smsLabel: 'Follow up by SMS',
      emailLabel: 'Follow up by email',
      copyLabel: 'Copy follow-up message',
      copiedLabel: 'Copied follow-up',
    }
  }

  return {
    label: 'Suggested invite message',
    message: buildReferralInviteMessage,
    whatsappLabel: 'Share on WhatsApp',
    smsLabel: 'Share by SMS',
    emailLabel: 'Share by email',
    copyLabel: 'Copy invite message',
    copiedLabel: 'Copied message',
  }
}

export function ReferralInviteCard({
  referralCode,
  referralLink,
  credits,
  convertedReferralCount,
  pendingReferralCount,
}: {
  referralCode: string
  referralLink: string
  credits: number
  convertedReferralCount: number
  pendingReferralCount: number
}) {
  const [copied, setCopied] = useState(false)
  const [messageCopied, setMessageCopied] = useState(false)
  const [sharePending, setSharePending] = useState(false)
  const messageVariant = getReferralMessageVariant(pendingReferralCount)
  const inviteMessage = messageVariant.message(referralLink)
  const momentumCopy = getReferralMomentumCopy(convertedReferralCount, pendingReferralCount)
  const milestoneCopy = getReferralMilestoneCopy(convertedReferralCount)
  const milestoneProgress = getReferralMilestoneProgress(convertedReferralCount)
  const conversionSnapshot = getReferralConversionSnapshot(convertedReferralCount, pendingReferralCount)
  const nextStepCopy = getReferralNextStepCopy(convertedReferralCount, pendingReferralCount)

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
        referral_count: convertedReferralCount,
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
        referral_count: convertedReferralCount,
        credits,
      })
    } catch {
      // User cancellations and unsupported share targets should stay silent.
    } finally {
      setSharePending(false)
    }
  }

  function handleChannelShare(
    channel: 'x' | 'facebook' | 'whatsapp' | 'telegram' | 'linkedin' | 'email' | 'sms',
  ) {
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
    })
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
          Share your invite link. You earn 10 credits when an invited member goes on to publish.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-background/80 p-3 text-center">
            <div className="text-2xl font-bold text-primary">{credits}</div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Credits
            </div>
          </div>
          <div className="rounded-lg border bg-background/80 p-3 text-center">
            <div className="text-2xl font-bold text-primary">{convertedReferralCount}</div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Converted
            </div>
          </div>
          <div className="rounded-lg border bg-background/80 p-3 text-center">
            <div className="text-2xl font-bold text-primary">{pendingReferralCount}</div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Pending
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
            {messageVariant.label}
          </div>
          <p className="mt-2 text-sm text-foreground">
            {inviteMessage}
          </p>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
            {momentumCopy.eyebrow}
          </div>
          <p className="mt-2 text-base font-semibold text-foreground">{momentumCopy.title}</p>
          <p className="mt-2 text-sm text-muted-foreground">{momentumCopy.body}</p>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-800">
            {nextStepCopy.eyebrow}
          </div>
          <p className="mt-2 text-base font-semibold text-foreground">{nextStepCopy.title}</p>
          <p className="mt-2 text-sm text-muted-foreground">{nextStepCopy.body}</p>
        </div>

        {conversionSnapshot ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-sky-800">
              {conversionSnapshot.eyebrow}
            </div>
            <p className="mt-2 text-base font-semibold text-foreground">{conversionSnapshot.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{conversionSnapshot.body}</p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{conversionSnapshot.label}</span>
                <span>{conversionSnapshot.value}%</span>
              </div>
              <Progress
                value={conversionSnapshot.value}
                className="h-2"
                aria-label="Invite conversion progress"
                aria-valuetext={conversionSnapshot.label}
              />
            </div>
          </div>
        ) : null}

        <div className="rounded-lg border border-sage/20 bg-background/90 p-4">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {milestoneCopy.eyebrow}
          </div>
          <p className="mt-2 text-base font-semibold text-foreground">{milestoneCopy.title}</p>
          <p className="mt-2 text-sm text-muted-foreground">{milestoneCopy.body}</p>
          {milestoneProgress ? (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{milestoneProgress.label}</span>
                <span>{milestoneProgress.value}%</span>
              </div>
              <Progress
                value={milestoneProgress.value}
                className="h-2"
                aria-label="Referral milestone progress"
                aria-valuetext={milestoneProgress.label}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {hasNativeShare ? (
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={handleShare}
              disabled={sharePending}
            >
              <Share2 className="h-4 w-4" />
              {sharePending ? 'Sharing...' : 'Share invite link'}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => handleChannelShare('whatsapp')}
          >
            <Share2 className="h-4 w-4" />
            {messageVariant.whatsappLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => handleChannelShare('sms')}
          >
            <Share2 className="h-4 w-4" />
            {messageVariant.smsLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => handleChannelShare('x')}
          >
            <Share2 className="h-4 w-4" />
            Share on X
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => handleChannelShare('facebook')}
          >
            <Share2 className="h-4 w-4" />
            Share on Facebook
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => handleChannelShare('telegram')}
          >
            <Share2 className="h-4 w-4" />
            Share on Telegram
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => handleChannelShare('linkedin')}
          >
            <Share2 className="h-4 w-4" />
            Share on LinkedIn
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => handleChannelShare('email')}
          >
            <Share2 className="h-4 w-4" />
            {messageVariant.emailLabel}
          </Button>
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied link' : 'Copy invite link'}
          </Button>
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleCopyMessage}>
            {messageCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {messageCopied ? messageVariant.copiedLabel : messageVariant.copyLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
