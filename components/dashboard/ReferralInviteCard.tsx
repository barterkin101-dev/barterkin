'use client'

import { useState } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function ReferralInviteCard({
  referralCode,
  referralLink,
}: {
  referralCode: string
  referralLink: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

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
        <div className="rounded-lg border bg-background/80 p-4">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Your referral code
          </div>
          <div className="mt-2 font-mono text-lg font-semibold tracking-[0.22em] text-foreground">
            {referralCode}
          </div>
          <div className="mt-3 break-all text-sm text-muted-foreground">{referralLink}</div>
        </div>

        <Button type="button" className="w-full sm:w-auto" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied link' : 'Copy invite link'}
        </Button>
      </CardContent>
    </Card>
  )
}
