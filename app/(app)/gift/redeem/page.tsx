import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GiftRedeemForm } from '@/components/gift/GiftRedeemForm'

export default async function GiftRedeemPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Redirect to login with returnTo
    const returnTo = token ? `/gift/redeem?token=${encodeURIComponent(token)}` : '/gift/redeem'
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`)
  }

  // Validate the token server-side
  let giftInfo: { recipient_email: string; tier: string; status: string } | null = null
  if (token) {
    const { data: gift } = await supabase
      .from('gift_purchases')
      .select('recipient_email, tier, status')
      .eq('id', token)
      .maybeSingle()

    if (gift) {
      giftInfo = gift
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-12">
      <div className="space-y-2 text-center">
        <h1 className="font-serif text-3xl font-bold">Redeem your gift</h1>
        <p className="text-muted-foreground">
          {giftInfo
            ? `Someone gifted you ${giftInfo.tier === 'founding' ? 'Founding Member' : 'Premium'} access to Barterkin.`
            : 'Enter your gift token to redeem Premium access.'}
        </p>
      </div>
      <GiftRedeemForm token={token ?? ''} giftStatus={giftInfo?.status ?? null} />
    </div>
  )
}
