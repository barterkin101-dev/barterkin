'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LoaderCircle, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function GiftRedeemForm({
  token,
  giftStatus,
}: {
  token: string
  giftStatus: string | null
}) {
  const router = useRouter()
  const [redeemToken, setRedeemToken] = useState(token)
  const [isPending, setIsPending] = useState(false)

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = redeemToken.trim()
    if (!trimmed) {
      toast.error('Please enter a gift token.')
      return
    }

    setIsPending(true)
    try {
      const res = await fetch('/api/gift/redeem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: trimmed }),
      })

      const payload = await res.json().catch(() => null) as
        | { ok?: boolean; error?: string; tier?: string }
        | null

      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error ?? 'Failed to redeem gift.')
      }

      toast.success(`Gift redeemed! You now have ${payload.tier === 'founding' ? 'Founding Member' : 'Premium'} access.`)
      router.push('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to redeem gift.')
      setIsPending(false)
    }
  }

  if (giftStatus === 'redeemed') {
    return (
      <div className="rounded-xl border bg-muted/20 p-6 text-center">
        <Gift className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="font-medium">This gift has already been redeemed.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          If you believe this is an error, please contact support.
        </p>
      </div>
    )
  }

  if (giftStatus === 'expired') {
    return (
      <div className="rounded-xl border bg-muted/20 p-6 text-center">
        <Gift className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="font-medium">This gift has expired.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Gifts expire if not redeemed within 30 days.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleRedeem} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="gift-token">Gift token</Label>
        <Input
          id="gift-token"
          value={redeemToken}
          onChange={(e) => setRedeemToken(e.target.value)}
          placeholder="Paste your gift token here"
          disabled={isPending}
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">
          The token was sent to your email along with the gift notification.
        </p>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Gift className="mr-2 size-4" />}
        Redeem gift
      </Button>
    </form>
  )
}
