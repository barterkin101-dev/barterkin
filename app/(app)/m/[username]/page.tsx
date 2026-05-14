import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { RatingCard } from '@/components/ratings/RatingCard'
import { getRatingsForProfile } from '@/lib/data/ratings'
import type { ProfileWithRelations } from '@/lib/actions/profile.types'
import { createLogger } from '@/lib/utils/logger'

// Middleware's VERIFIED_REQUIRED_PREFIXES already covers '/m/' — auth+verify gate runs before this page.

// Pitfall §9: force-dynamic prevents cross-viewer cache leak.
// Without this, Next.js may cache a rendered page for User A and serve it to User B,
// exposing the wrong MessageButton / OverflowMenu visibility.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('display_name, bio, county_id, counties(name)')
    .eq('username', username)
    .maybeSingle()
  const name = data?.display_name ?? username
  const county = (data?.counties as { name?: string } | null)?.name ?? 'Georgia'
  const bio = data?.bio ?? ''
  const description = bio
    ? `${bio.slice(0, 120)}${bio.length > 120 ? '…' : ''} — ${county}`
    : `${name} is offering skills to trade on Barterkin in ${county}.`
  return {
    title: `${name} — Barterkin`,
    description,
    alternates: { canonical: `/m/${username}` },
    openGraph: {
      title: `${name} — Barterkin`,
      description,
      url: `/m/${username}`,
      siteName: 'Barterkin',
      type: 'profile',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} — Barterkin`,
      description,
    },
    robots: { index: true, follow: true },
  }
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()

  // RLS filters:
  //   - owner sees own regardless of publish state (harmless — user lands on their OWN /m/slug too)
  //   - others see only (is_published AND current_user_is_verified() AND NOT banned)
  // Nonexistent username → empty rows → not-available state below.
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('*, skills_offered(*), skills_wanted(*), counties(name), categories(id, name, slug)')
    .eq('username', username)
    .maybeSingle()

  if (!profileRow) {
    // UI-SPEC §Empty states — /m/[username] not found / unpublished
    return (
      <div className="mx-auto max-w-2xl space-y-6 text-center">
        <h1 className="font-serif text-2xl font-bold leading-[1.2]">
          This profile isn&rsquo;t available.
        </h1>
        <p className="text-base text-forest-mid">
          It may have been removed, unpublished, or the link is wrong. Head to the directory to
          find other members.
        </p>
        <Link href="/directory" className={cn(buttonVariants())}>
          Go to directory
        </Link>
      </div>
    )
  }

  // Pitfall §1: getUser() revalidates against auth server — use for identity, not getSession()
  const { data: { user } } = await supabase.auth.getUser()
  const viewerOwnerId = user?.id ?? null

  if (user && user.id !== profileRow.owner_id && profileRow.is_published) {
    const { data: viewerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (viewerProfile?.id) {
      const { error } = await supabase.from('profile_views').insert({
        viewer_profile_id: viewerProfile.id,
        viewed_profile_id: profileRow.id,
      })

      if (error) {
        createLogger('member-profile').error('profile view insert error', {
          context: { code: error.code, viewedProfileId: profileRow.id },
        })
      }
    }
  }

  const { ratings, avg, count } = await getRatingsForProfile(profileRow.id)

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <ProfileCard
        profile={profileRow as ProfileWithRelations}
        viewerOwnerId={viewerOwnerId}
        profileOwnerId={profileRow.owner_id}
        profileId={profileRow.id}
        acceptingContact={profileRow.accepting_contact}
        ratingAvg={avg}
        ratingCount={count}
      />

      {count > 0 && (
        <div className="space-y-4">
          <h2 className="font-serif text-2xl font-bold">Reviews</h2>
          <div className="space-y-3">
            {ratings.map((rating) => (
              <RatingCard key={rating.id} rating={rating} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
