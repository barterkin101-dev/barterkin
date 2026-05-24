'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { captureClientEvent } from '@/lib/analytics-client'
import {
  buildCountyReferralLink,
  buildCountyReferralInviteMessage,
  buildWhatsAppReferralShareUrl,
  buildEmailReferralShareUrl,
} from '@/lib/referral-share'
import { Copy, Check, Share2, Mail, MessageCircle } from 'lucide-react'

interface InviteCountyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  countyId: number
  countyName: string
  referralCode: string
  referralCount: number
  unlocked: boolean
}

export function InviteCountyModal({
  open,
  onOpenChange,
  countyId,
  countyName,
  referralCode,
  referralCount,
  unlocked,
}: InviteCountyModalProps) {
  const [copied, setCopied] = useState(false)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'
  const referralLink = buildCountyReferralLink(siteUrl, referralCode, countyId)
  const message = buildCountyReferralInviteMessage(referralLink, countyName)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      captureClientEvent('invite_link_copied', {
        source: 'county_modal',
        county_id: countyId,
        county_name: countyName,
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback not needed for modern browsers
    }
  }

  const handleShare = (channel: string) => {
    captureClientEvent('invite_sent', {
      channel,
      source: 'county_modal',
      county_id: countyId,
      county_name: countyName,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-green-900/30 bg-green-950 text-green-50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-green-100">
            {unlocked ? 'Share with your county' : `Invite ${countyName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!unlocked && (
            <p className="text-sm text-green-200/70">
              {referralCount >= 2
                ? 'One more neighbor and your county unlocks 25 bonus credits!'
                : `Get 3 people from ${countyName} to join and unlock 25 bonus credits.`}
            </p>
          )}

          <div className="rounded-lg border border-green-800/40 bg-green-900/30 p-3">
            <p className="text-sm text-green-100">{message}</p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCopy}
              className="flex-1 bg-green-800 text-green-50 hover:bg-green-700"
              size="sm"
            >
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? 'Copied' : 'Copy link'}
            </Button>

            <Button
              asChild
              onClick={() => handleShare('whatsapp')}
              className="bg-green-800 text-green-50 hover:bg-green-700"
              size="sm"
            >
              <a
                href={buildWhatsAppReferralShareUrl(referralLink, message)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </Button>

            <Button
              asChild
              onClick={() => handleShare('email')}
              className="bg-green-800 text-green-50 hover:bg-green-700"
              size="sm"
            >
              <a href={buildEmailReferralShareUrl(referralLink, message)}>
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs text-green-300/50">
            <span>Progress: {referralCount}/3</span>
            {unlocked && <span className="text-green-400">Unlocked!</span>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
