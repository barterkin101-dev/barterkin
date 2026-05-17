import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { buildReferralLink } from '@/lib/referrals'
import { captureEvent } from '@/lib/analytics'
import { ReferralProgramClient } from '@/components/referrals/ReferralProgramClient'

export const metadata: Metadata = {
  title: 'Referral Program',
  description: 'Invite friends to Barterkin and earn credits for every member who joins and publishes.',
}

export const dynamic = 'force-dynamic'

export default async function ReferralsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?returnTo=/referrals')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, referral_code, display_name')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!profile) {
    redirect('/login?returnTo=/referrals')
  }

  const referralCode = profile.referral_code
  const referralLink = referralCode
    ? buildReferralLink(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com', referralCode)
    : null

  // Fetch referral stats
  const { data: referralRows } = await supabase
    .from('referrals')
    .select('id, credited_at')
    .eq('inviter_id', profile.id)

  const referrals = referralRows ?? []
  const convertedReferralCount = referrals.filter((r) => Boolean(r.credited_at)).length
  const pendingReferralCount = referrals.length - convertedReferralCount

  // Fetch referral-specific credit balance
  const REFERRAL_CREDIT_REASONS = ['referral_bonus', 'referral_welcome', 'quest_referral_converted']
  const { data: creditRows } = await supabase
    .from('credit_ledger')
    .select('amount')
    .eq('profile_id', profile.id)
    .in('reason', REFERRAL_CREDIT_REASONS)

  const referralCreditBalance = (creditRows ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0)

  // Track page view
  await captureEvent(user.id, 'referral_page_viewed', {
    referral_code: referralCode,
    converted_referrals: convertedReferralCount,
    pending_referrals: pendingReferralCount,
    credits: referralCreditBalance,
  })

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">
          Referral Program
        </h1>
        <p className="text-base text-muted-foreground">
          Invite friends to Barterkin and earn 10 credits for every member who joins and publishes their first listing.
        </p>
      </header>

      <ReferralProgramClient
        referralCode={referralCode}
        referralLink={referralLink}
        displayName={profile.display_name}
        credits={referralCreditBalance}
        convertedReferralCount={convertedReferralCount}
        pendingReferralCount={pendingReferralCount}
      />
    </div>
  )
}
