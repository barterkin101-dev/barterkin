import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSavedListings } from '@/lib/actions/saved-listings'
import { Card, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ListingGrid } from '@/components/listings/ListingGrid'
import { Heart, ArrowLeft } from 'lucide-react'

export default async function SavedListingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Please sign in to view your saved listings.</p>
      </div>
    )
  }

  const result = await getSavedListings()

  if (!result.ok) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
          <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">
            Saved Listings
          </h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-lg text-muted-foreground">
              Couldn&apos;t load your saved listings.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.error ?? 'Please try again later.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const savedListings = result.savedListings ?? []
  const listings = savedListings
    .map((sl) => sl.listing)
    .filter((l): l is NonNullable<typeof l> => l !== null)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Link>
        <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">
          Saved Listings
        </h1>
      </div>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Heart className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg text-muted-foreground">No saved listings yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse listings and click the heart icon to save them here.
            </p>
            <Link href="/listings" className={cn(buttonVariants(), 'mt-6')}>
              Browse listings
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ListingGrid listings={listings} />
      )}
    </div>
  )
}
