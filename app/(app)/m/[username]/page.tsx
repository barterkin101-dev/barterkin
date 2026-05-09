import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { RatingCard } from '@/components/ratings/RatingCard'
import { getRatingsForProfile } from '@/lib/data/ratings'
import type { ProfileWithRelations } from '@/lib/actions/profile.types'

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
    .select('display_name')
    .eq('username', username)
    .maybeSingle()
  const name = data?.display_name
  return {
    title: name ? `${name} -- Barterkin` : 'Member -- Barterkin',
    // PROF-14 + D-09: auth-gated, so don't encourage indexing
    robots: { index: false, follow: false },
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
