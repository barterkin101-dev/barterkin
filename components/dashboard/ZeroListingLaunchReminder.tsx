'use client'

import Link from 'next/link'
import { ArrowRight, Mail, MessageSquareText, Rocket, Share2, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { captureClientEvent } from '@/lib/analytics-client'
import {
  buildEmailReferralShareUrl,
  buildSmsReferralShareUrl,
  buildWhatsAppReferralShareUrl,
} from '@/lib/referral-share'
import type { ZeroListingLaunchReminder as ZeroListingLaunchReminderData } from '@/lib/data/dashboard-reminders'

const SHARE_CHANNELS = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: Share2,
    buildHref: buildWhatsAppReferralShareUrl,
  },
  {
    key: 'sms',
    label: 'SMS',
    icon: MessageSquareText,
    buildHref: buildSmsReferralShareUrl,
  },
  {
    key: 'email',
    label: 'Email',
    icon: Mail,
    buildHref: buildEmailReferralShareUrl,
  },
] as const

export function ZeroListingLaunchReminder({
  reminder,
}: {
  reminder: ZeroListingLaunchReminderData
}) {
  const shareChannels = reminder.referralLink
    ? SHARE_CHANNELS.map((channel) => ({
      ...channel,
      href: channel.buildHref(reminder.referralLink!),
    }))
    : []
  const hasReferral = Boolean(reminder.referralCode && shareChannels.length > 0)

  function handleShareClick(method: 'whatsapp' | 'sms' | 'email') {
    if (!reminder.referralCode || !reminder.referralLink) return

    const shareChannel = SHARE_CHANNELS.find((channel) => channel.key === method)
    if (!shareChannel) {
      return
    }

    window.open(shareChannel.buildHref(reminder.referralLink), '_blank', 'noopener,noreferrer')

    captureClientEvent('referral_invite_shared', {
      method,
      referral_code: reminder.referralCode,
      referral_count: reminder.referralCount,
      credits: reminder.credits,
      share_surface: 'zero_listing_launch',
    })
  }

  return (
    <Card className="border-sky-200 bg-sky-50/80">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sky-950">
            <Rocket className="h-5 w-5 text-sky-700" />
            <h2 className="font-semibold">Launch your first listing</h2>
          </div>
          <p className="max-w-2xl text-sm text-sky-950/80">
            {reminder.rewardCredits
              ? `Publish your first offer or service to start showing up in discovery and earn ${reminder.rewardCredits} quest credits automatically.`
              : 'Publish a fresh offer or service so members can discover you and start new trade conversations.'}
          </p>
          <div className="flex items-center gap-2 text-xs text-sky-950/70">
            <Sparkles className="h-3.5 w-3.5" />
            <span>One live listing is enough to give the marketplace something concrete to respond to.</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <Link
            href={reminder.href}
            className={cn(
              buttonVariants({ size: 'lg' }),
              'shrink-0 bg-sky-700 text-white hover:bg-sky-800',
            )}
          >
            Create listing
            <ArrowRight className="h-4 w-4" />
          </Link>

          {hasReferral && (
            <div className="space-y-2">
              <p className="text-right text-xs font-medium text-sky-900/80">
                Invite a neighbor before you post
              </p>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {shareChannels.map((channel) => {
                  const Icon = channel.icon

                  return (
                    <Button
                      key={channel.key}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShareClick(channel.key)}
                      className={cn(
                        'text-sky-700 hover:text-sky-800 hover:bg-sky-100',
                      )}
                    >
                      <Icon className="mr-1.5 h-3.5 w-3.5" />
                      Share via {channel.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
