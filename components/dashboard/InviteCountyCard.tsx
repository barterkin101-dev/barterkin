'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InviteCountyModal } from './InviteCountyModal'
import { captureClientEvent } from '@/lib/analytics-client'

interface InviteCountyCardProps {
  countyId: number
  countyName: string
  referralCode: string
  referralCount: number
  unlocked: boolean
  creditsAwarded: number
}

export function InviteCountyCard({
  countyId,
  countyName,
  referralCode,
  referralCount,
  unlocked,
  creditsAwarded,
}: InviteCountyCardProps) {
  const [open, setOpen] = useState(false)

  const handleOpen = () => {
    captureClientEvent('invite_county_card_opened', {
      county_id: countyId,
      county_name: countyName,
      referral_count: referralCount,
      unlocked,
    })
    setOpen(true)
  }

  const remaining = Math.max(0, 3 - referralCount)

  return (
    <>
      <Card className="border-green-900/20 bg-gradient-to-br from-green-950/40 to-green-900/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-green-100">
            {unlocked ? 'County Unlocked!' : 'Invite your county'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-green-200/70">
            {unlocked
              ? `You have invited 3+ neighbors from ${countyName}. +${creditsAwarded} credits awarded!`
              : `Get 3 people from ${countyName} to join Barterkin and unlock 25 bonus credits.`}
          </p>

          {!unlocked && (
            <div className="flex items-center gap-2 text-xs text-green-200/50">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              {remaining === 0
                ? 'Almost there — one more referral!'
                : `${remaining} more referral${remaining === 1 ? '' : 's'} to unlock`}
            </div>
          )}

          <Button
            onClick={handleOpen}
            className="w-full bg-green-700 text-white hover:bg-green-600"
            size="sm"
          >
            {unlocked ? 'Share again' : 'Invite neighbors'}
          </Button>
        </CardContent>
      </Card>

      <InviteCountyModal
        open={open}
        onOpenChange={setOpen}
        countyId={countyId}
        countyName={countyName}
        referralCode={referralCode}
        referralCount={referralCount}
        unlocked={unlocked}
      />
    </>
  )
}
