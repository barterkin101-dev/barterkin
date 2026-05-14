import { createClient } from '@/lib/supabase/server'
import { getListingById } from '@/lib/data/listings'
import { ListingForm } from '@/components/listings/ListingForm'
import { ListingFeaturePanel } from '@/components/listings/ListingFeaturePanel'
import { redirect, notFound } from 'next/navigation'

interface EditListingPageProps {
  params: Promise<{ id: string }>
}

export default async function EditListingPage({ params }: EditListingPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const listing = await getListingById(id)
  if (!listing) notFound()

  // Verify ownership
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tier, credits')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!profile || listing.profile_id !== profile.id) {
    redirect('/dashboard/listings')
  }

  const [{ data: categories }, { data: counties }] = await Promise.all([
    supabase.from('categories').select('id, name').order('id'),
    supabase.from('counties').select('id, name').order('name'),
  ])

  return (
    <div className="space-y-6">
      <ListingFeaturePanel
        listingId={listing.id}
        tier={profile.tier}
        credits={profile.credits ?? 0}
        featuredUntil={listing.featured_until}
      />
      <ListingForm
        userId={user.id}
        categories={categories ?? []}
        counties={counties ?? []}
        defaultValues={listing}
        returnTo="/dashboard/listings"
      />
    </div>
  )
}
