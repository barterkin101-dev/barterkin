import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { PublishToggle } from '@/components/profile/PublishToggle'
import { markContactsSeen } from '@/lib/actions/contact'
import type { ProfileWithRelations } from '@/lib/actions/profile.types'

export const metadata = { title: 'Your profile' }

export default async function OwnProfilePage() {
  // Clear new-contact badge BEFORE render — visiting /profile marks contacts as seen
  await markContactsSeen().catch(() => { /* non-blocking: render regardless */ })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('*, skills_offered(*), skills_wanted(*), counties(name), categories(id, name, slug)')
    .eq('owner_id', user.id)
    .maybeSingle()

  // User has never saved a profile -- nudge them to /profile/edit
  if (!profileRow) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 text-center">
        <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">
          Build your profile
        </h1>
        <p className="text-base text-forest-mid">
          A few minutes now makes it easy for the right Georgian to find you. Start with your name,
          add a photo, and list what you can trade.
        </p>
        <Button asChild size="lg">
          <Link href="/profile/edit">Start your profile</Link>
        </Button>
      </div>
    )
  }

  const profile = profileRow as ProfileWithRelations
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">
          Your profile
        </h1>
        <Button asChild>
          <Link href="/profile/edit">Edit profile</Link>
        </Button>
      </div>

      {!profile.is_published && (
        <div className="rounded-md border border-sage-light bg-sage-pale p-4">
          <p className="font-medium text-forest-deep">Your profile is ready.</p>
          <p className="text-sm text-forest-mid">
            Turn on Publish to appear in the directory. You can edit or unpublish at any time.
          </p>
        </div>
      )}

      <PublishToggle
        profileId={profile.id}
        isPublished={profile.is_published ?? false}
        completeness={{
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          countyId: profile.county_id,
          categoryId: profile.category_id,
          skillsOfferedCount: profile.skills_offered?.length ?? 0,
        }}
      />

      <ProfileCard profile={profile} />
    </div>
  )
}
